// eslint-disable-next-line import/no-namespace -- `tokenClassNodeProp` is an Obsidian-runtime-only export, absent from the public `@codemirror/language` types; a namespace import lets us read it defensively (see below).
import * as cmLanguage from "@codemirror/language";
import {
  type ChangeSpec,
  EditorSelection,
  EditorState,
  type Extension,
  StateEffect,
  StateField,
  type TransactionSpec,
} from "@codemirror/state";
import { type InputRule, type SmartTypographySettings } from "./types";
import { type NodeProp, type Tree } from "@lezer/common";

const { syntaxTree } = cmLanguage;

// `tokenClassNodeProp` tags each syntax node with its Obsidian token class
// (e.g. "hmd-codeblock", "math", "hashtag"). Obsidian's bundled CodeMirror
// provides it at runtime (it is external in our build), but it is not part of
// `@codemirror/language`'s public types/exports — so we read it defensively.
// Bonus: unit tests run against the stock package where it is simply absent,
// and replacements then skip the ignore-list filter.
const { tokenClassNodeProp } = cmLanguage as { tokenClassNodeProp?: NodeProp<string> };

// Token classes we never want to rewrite inside (code blocks, math, frontmatter,
// Templater expressions, hashtags). Matched against the CodeMirror token class.
export const ignoreListRegEx = /frontmatter|code|math|templater|hashtag/u;

/**
 * Build the CodeMirror 6 editor extension that performs smart-typography
 * replacements. Decoupled from the Obsidian `Plugin` instance: the current rule
 * map and settings are read lazily through the two getters so live settings
 * changes take effect without re-registering the extension.
 *
 * Returns `[stateField, transactionFilter]` — pass straight to
 * `Plugin.registerEditorExtension`. Fully exercisable in unit tests by building
 * a plain `EditorState` and dispatching `input.type` / `delete.backward`
 * transactions.
 */
export function createTypographyExtension(
  getInputRuleMap: () => Record<string, InputRule[]>,
  getSettings: () => SmartTypographySettings,
  // Returns true when the editor's file is excluded from correction (path list
  // or per-note frontmatter). Injected by the plugin; defaults to never-ignore
  // so the engine stays unit-testable without the Obsidian runtime.
  isIgnored: (state: EditorState) => boolean = () => false,
): Extension {
  // When smart typography overrides changes, we keep a record so we can undo
  // them when the user presses backspace.
  const storeTransaction = StateEffect.define<TransactionSpec | null>();

  const prevTransactionState = StateField.define<TransactionSpec | null>({
    create() {
      return null;
    },
    update(oldVal, tr) {
      for (const e of tr.effects) {
        if (e.is(storeTransaction)) {
          return e.value;
        }
      }

      // Any selection change (cursor move via Home/End/arrows/click) invalidates
      // a pending revert — otherwise a later backspace would undo an edit the
      // cursor has since moved away from. Some cursor commands carry no user
      // event, so check `tr.selection` directly, not only "select"/"move". (#58)
      if (
        !oldVal ||
        tr.selection ||
        tr.isUserEvent("input") ||
        tr.isUserEvent("delete.forward") ||
        tr.isUserEvent("delete.cut") ||
        tr.isUserEvent("move") ||
        tr.isUserEvent("select") ||
        tr.isUserEvent("undo")
      ) {
        return null;
      }

      return oldVal;
    },
  });

  const transactionFilter = EditorState.transactionFilter.of((tr) => {
    // Skip files the user excluded (path list or per-note frontmatter).
    if (isIgnored(tr.state)) {
      return tr;
    }

    // Revert any stored changes on delete
    if (tr.isUserEvent("delete.backward") || tr.isUserEvent("delete.selection")) {
      return tr.startState.field(prevTransactionState, false) || tr;
    }

    // If the user hasn't typed, or the doc hasn't changed, return early
    if (!tr.isUserEvent("input.type") || !tr.docChanged) {
      return tr;
    }

    const inputRuleMap = getInputRuleMap();
    const settings = getSettings();

    // Cache the syntax tree if we end up accessing it
    let tree: Tree | null = null;

    // Memoize any positions we check so we can avoid some work
    const seenPositions: Record<number, boolean> = {};

    const canPerformReplacement = (pos: number) => {
      if (seenPositions[pos] !== undefined) {
        return seenPositions[pos];
      }

      if (!tree) tree = syntaxTree(tr.state);

      const nodeProps = tokenClassNodeProp
        ? tree.resolveInner(pos, 1).type.prop(tokenClassNodeProp)
        : undefined;

      seenPositions[pos] = !(nodeProps && ignoreListRegEx.test(nodeProps));

      return seenPositions[pos];
    };

    // Store a list of changes and specs to revert these changes
    const changes: ChangeSpec[] = [];
    const reverts: ChangeSpec[] = [];

    const registerChange = (change: ChangeSpec, revert: ChangeSpec) => {
      changes.push(change);
      reverts.push(revert);
    };

    const contextCache: Record<number, string> = {};
    let newSelection = tr.selection;

    tr.changes.iterChanges((fromA, _toA, fromB, _toB, inserted) => {
      const insertedText = inserted.sliceString(0, inserted.length);
      const matchedRules = inputRuleMap[insertedText];

      if (!matchedRules) {
        return;
      }

      for (const rule of matchedRules) {
        // If we're in a codeblock, etc, return early, no need to continue checking
        if (!canPerformReplacement(fromA)) return;

        // Grab and cache three chars before the one being inserted
        if (contextCache[fromA] === undefined) {
          contextCache[fromA] = tr.newDoc.sliceString(fromB - 3, fromB);
        }

        const context = contextCache[fromA];

        if (!rule.contextMatch.test(context)) {
          continue;
        }

        const insert = typeof rule.to === "string" ? rule.to : rule.to(settings);
        const replacementLength = rule.from.length - rule.trigger.length;
        const insertionPoint = fromA - replacementLength;
        const reversionPoint = fromB - replacementLength;

        registerChange(
          {
            from: insertionPoint,
            to: insertionPoint + replacementLength,
            insert,
          },
          {
            from: reversionPoint,
            to: reversionPoint + insert.length,
            insert: rule.from,
          },
        );

        const selectionAdjustment = rule.from.length - insert.length;

        // `tr.selection` can be undefined for doc changes that set no selection
        // (some IME/programmatic edits); guard so we never read `.ranges` of
        // undefined. (#42)
        if (newSelection) {
          newSelection = EditorSelection.create(
            newSelection.ranges.map((r) =>
              EditorSelection.range(r.anchor - selectionAdjustment, r.head - selectionAdjustment),
            ),
          );
        }

        return;
      }
    }, false);

    // If we have any changes, construct a transaction spec
    if (changes.length > 0) {
      return [
        {
          effects: storeTransaction.of({
            effects: storeTransaction.of(null),
            selection: tr.selection,
            scrollIntoView: tr.scrollIntoView,
            changes: reverts,
          }),
          selection: newSelection,
          scrollIntoView: tr.scrollIntoView,
          changes,
        },
      ];
    }

    return tr;
  });

  return [prevTransactionState, transactionFilter];
}
