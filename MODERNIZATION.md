# Modernization notes

This fork's first body of work was a toolchain + codebase modernization, mirroring the sibling fork [`longform`](https://github.com/delfianto/longform). No user-facing typography behavior changed (it is locked down by the test suite); everything below is about the build, structure, and test coverage.

## What changed

### Toolchain: Rollup + Yarn → Vite+ + Bun + Vitest

- Build/lint/format/test run through **Vite+** (`vp`): `vp build`, strict **oxlint** (`vp lint -c .oxlintrc.json` — every category set to `error`), **oxfmt** (`vp fmt -c .oxfmtrc.json`), and **Vitest** (`vp test run`). `vite` is mapped to `@voidzero-dev/vite-plus-core` via `package.json` `overrides`; Vitest is a direct dependency.
- **Bun** is the package manager and runtime.
- `vite.config.mts` builds a CJS `main.js` (Obsidian + CodeMirror + Node builtins kept external). Watch mode deploys into a live vault via `$PLUGINS_DIR` (see `.envrc.example`), falling back to the in-repo `test-vault/`.
- `tsconfig.json` is now ESNext / `bundler` resolution / `strict`.
- Removed: `rollup.config.js`, `yarn.lock`.

### Removed the legacy CodeMirror 5 path

`legacyInputRules.ts` and the CM5 handlers (`beforeChangeHandler`, `registerCodeMirror`, `iterateCodeMirrors`) were deleted. Obsidian 1.0+ is CodeMirror 6 only, so this code was unreachable, and the current `obsidian` typings no longer ship the `CodeMirror` global it relied on. `minAppVersion` is now `1.0.0`.

### `src/` layout + extracted, testable units

The monolithic root `main.ts` was split so the logic is importable without the Obsidian runtime:

| File | Responsibility |
| --- | --- |
| `src/types.ts` | `SmartTypographySettings` + `InputRule` interfaces |
| `src/input-rules.ts` | CM6 rule tables + pure `buildInputRules(settings)` |
| `src/editor-extension.ts` | `createTypographyExtension(getRuleMap, getSettings)` — the `transactionFilter` engine + revert state field |
| `src/settings.ts` | `DEFAULT_SETTINGS` + the settings tab |
| `src/main.ts` | thin `Plugin`: load/save settings, register the extension + settings tab |

The engine factory takes getters for the rule map and settings, so live settings changes take effect without re-registering the extension — and so a unit test can drive it with a plain `EditorState`.

### Metadata

- Plugin id `smart-typography-refresh` (upstream was `obsidian-smart-typography`) — a distinct id so it coexists with the original; `author`/`authorUrl` updated; `name` → "Smart Typography Refresh".
- `package.json` license corrected to `GPL-3.0-only` (the `LICENSE.md` is GPL-3.0; the old manifest mislabeled it MIT).
- CI (`.github/workflows/unit-tests.yml`) runs the full gate on Bun for every push/PR to `main`; `release.yml` auto-publishes a GitHub release on push to `main` whenever `manifest.json` carries a version that has no release yet (it builds and attaches `dist/main.js` + `dist/manifest.json`); the upstream author's `FUNDING.yml` was removed.

## Test coverage

`test/` (Vitest, with `obsidian` aliased to a stub in `test/__mocks__/`):

- **`input-rules.test.ts`** — `to` resolvers read from settings; `contextMatch` behavior; `buildInputRules` rule selection per flag, the `skipEnDash` swap, and trigger grouping/order.
- **`editor-extension.test.ts`** — drives a real `@codemirror/state` `EditorState` through the extension and asserts the resulting document for every category (dashes, ellipsis, quotes, arrows, guillemets, comparisons, fractions), custom glyphs, disabled features, and the Backspace-revert path.
- **`settings.test.ts`** — `DEFAULT_SETTINGS` shape and that each settings control mutates state + persists (including the single-character glyph guard).

`src/main.ts` is a thin wiring shell; the logic it delegates to is fully covered above.

## Verification gate

All four must pass (also enforced in CI):

```bash
bun run check        # format + lint
bun run type-check   # tsc --noEmit
bun run test         # vitest
bun run build        # production bundle → dist/main.js + manifest.json
```
