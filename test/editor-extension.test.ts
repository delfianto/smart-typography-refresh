import { describe, expect, it } from "vitest";
import { buildInputRules } from "../src/input-rules";
import { createTypographyExtension } from "../src/editor-extension";
import { EditorState } from "@codemirror/state";
import { type SmartTypographySettings } from "../src/types";

// Every feature on, so a single state can exercise all rule categories. Tests
// that need a variant (e.g. skipEnDash) pass an override.
const SETTINGS: SmartTypographySettings = {
  curlyQuotes: true,
  emDash: true,
  ellipsis: true,
  arrows: true,
  guillemets: true,
  comparisons: true,
  fractions: true,
  skipEnDash: false,
  ignoredPaths: "",
  openSingle: "‘",
  closeSingle: "’",
  openDouble: "“",
  closeDouble: "”",
  openGuillemet: "«",
  closeGuillemet: "»",
  leftArrow: "←",
  rightArrow: "→",
};

function makeState(doc: string, settings: SmartTypographySettings = SETTINGS): EditorState {
  const { inputRuleMap } = buildInputRules(settings);
  const extension = createTypographyExtension(
    () => inputRuleMap,
    () => settings,
  );
  return EditorState.create({
    doc,
    selection: { anchor: doc.length },
    extensions: [extension],
  });
}

// Simulate the user typing `text` at offset `at`, as Obsidian would
// (`input.type` user event), and return the resulting document.
function typeInto(
  doc: string,
  at: number,
  text: string,
  settings: SmartTypographySettings = SETTINGS,
): string {
  const { state } = makeState(doc, settings).update({
    changes: { from: at, insert: text },
    selection: { anchor: at + text.length },
    userEvent: "input.type",
  });
  return state.doc.toString();
}

describe("typography replacements", () => {
  it("dashes chain en → em → triple", () => {
    expect(typeInto("-", 1, "-")).toBe("–"); // -- → en dash
    expect(typeInto("–", 1, "-")).toBe("—"); // –- → em dash
    expect(typeInto("—", 1, "-")).toBe("---"); // —- → three dashes
  });

  it("skipEnDash turns -- straight into an em dash", () => {
    expect(typeInto("-", 1, "-", { ...SETTINGS, skipEnDash: true })).toBe("—");
  });

  it("three periods become an ellipsis", () => {
    expect(typeInto("..", 2, ".")).toBe("…");
  });

  it("double quotes open after whitespace and close otherwise", () => {
    expect(typeInto(" ", 1, '"')).toBe(" “");
    expect(typeInto("hi", 2, '"')).toBe("hi”");
  });

  it("single quotes open after whitespace and close otherwise", () => {
    expect(typeInto(" ", 1, "'")).toBe(" ‘");
    expect(typeInto("it", 2, "'")).toBe("it’");
  });

  it("uses a closing single quote for in-word contractions (issue #33)", () => {
    expect(typeInto("don", 3, "'")).toBe("don’"); // don't → don’t
    expect(typeInto("I", 1, "'")).toBe("I’"); // I'm → I’m
  });

  it("paired quotes insert an open/close glyph pair", () => {
    expect(typeInto("", 0, '""')).toBe("“”");
    expect(typeInto("", 0, "''")).toBe("‘’");
  });

  it("arrows convert from ascii", () => {
    expect(typeInto("<", 1, "-")).toBe("←");
    expect(typeInto("-", 1, ">")).toBe("→");
  });

  it("guillemets convert from doubled angle brackets", () => {
    expect(typeInto("<", 1, "<")).toBe("«");
    expect(typeInto(">", 1, ">")).toBe("»");
  });

  it("comparison operators convert", () => {
    expect(typeInto(">", 1, "=")).toBe("≥");
    expect(typeInto("<", 1, "=")).toBe("≤");
    expect(typeInto("/", 1, "=")).toBe("≠");
  });

  it("fractions convert at a word boundary", () => {
    expect(typeInto("1/", 2, "2")).toBe("½");
    expect(typeInto("2/", 2, "3")).toBe("⅔");
    expect(typeInto("1/1", 3, "0")).toBe("⅒");
  });

  it("honors custom replacement glyphs from settings", () => {
    const custom = { ...SETTINGS, openDouble: "«", rightArrow: "⇒" };
    expect(typeInto(" ", 1, '"', custom)).toBe(" «");
    expect(typeInto("-", 1, ">", custom)).toBe("⇒");
  });

  it("leaves non-trigger input untouched", () => {
    expect(typeInto("abc", 3, "d")).toBe("abcd");
  });

  it("does nothing when the feature is disabled", () => {
    expect(typeInto("-", 1, "-", { ...SETTINGS, emDash: false })).toBe("--");
  });
});

describe("backspace reverts the previous replacement", () => {
  it("restores the typed characters after a dash replacement", () => {
    let state = makeState("-");
    state = state.update({
      changes: { from: 1, insert: "-" },
      selection: { anchor: 2 },
      userEvent: "input.type",
    }).state;
    expect(state.doc.toString()).toBe("–");

    // Backspace immediately after: the stored revert restores what was typed.
    state = state.update({
      changes: { from: 0, to: 1 },
      userEvent: "delete.backward",
    }).state;
    expect(state.doc.toString()).toBe("--");
  });

  it("does not revert once the cursor has moved away (issue #58)", () => {
    let state = makeState("hello");
    // Type a closing quote after "hello"; the engine curls it to ”.
    state = state.update({
      changes: { from: 5, insert: '"' },
      selection: { anchor: 6 },
      userEvent: "input.type",
    }).state;
    expect(state.doc.toString()).toBe("hello”");

    // Move the cursor (End/Home/arrows) — a selection-only transaction.
    state = state.update({ selection: { anchor: 0 } }).state;

    // Backspace now deletes normally instead of reverting the curly quote.
    state = state.update({
      changes: { from: 0, to: 1 },
      userEvent: "delete.backward",
    }).state;
    expect(state.doc.toString()).toBe("ello”");
  });
});

describe("regressions", () => {
  it("applies a replacement when the transaction sets no selection (issue #42)", () => {
    const { inputRuleMap } = buildInputRules(SETTINGS);
    const extension = createTypographyExtension(
      () => inputRuleMap,
      () => SETTINGS,
    );
    const state = EditorState.create({
      doc: "-",
      selection: { anchor: 1 },
      extensions: [extension],
    });
    // No `selection` in the spec → tr.selection is undefined inside the filter.
    // Must not throw "Cannot read properties of undefined (reading 'ranges')".
    const next = state.update({
      changes: { from: 1, insert: "-" },
      userEvent: "input.type",
    }).state;
    expect(next.doc.toString()).toBe("–");
  });
});

describe("ignored editors", () => {
  const typeDash = (isIgnored: () => boolean) => {
    const { inputRuleMap } = buildInputRules(SETTINGS);
    const extension = createTypographyExtension(
      () => inputRuleMap,
      () => SETTINGS,
      isIgnored,
    );
    const state = EditorState.create({
      doc: "-",
      selection: { anchor: 1 },
      extensions: [extension],
    });
    return state
      .update({
        changes: { from: 1, insert: "-" },
        selection: { anchor: 2 },
        userEvent: "input.type",
      })
      .state.doc.toString();
  };

  it("performs no replacement when the editor is ignored", () => {
    expect(typeDash(() => true)).toBe("--");
  });

  it("replaces normally when the editor is not ignored", () => {
    expect(typeDash(() => false)).toBe("–");
  });
});
