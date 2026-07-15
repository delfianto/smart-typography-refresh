// Whole-file / folder exclusion from typography correction. Pure logic (no
// Obsidian or CodeMirror imports) so it is unit-testable in isolation; the
// plugin feeds it the current file's path + frontmatter at runtime.

// Frontmatter property that overrides the path list for a single note:
//   smart-typography: false  → never correct this note
//   smart-typography: true   → always correct, even inside an ignored folder
export const IGNORE_FRONTMATTER_KEY = "smart-typography";

/** Parse the raw "ignored paths" textarea into a normalized list of vault paths. */
export function parseIgnoredPaths(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => line.replace(/^\/+/u, "").replace(/\/+$/u, ""))
    .filter((line) => line.length > 0);
}

/**
 * True when `filePath` equals an ignored entry or sits anywhere under an ignored
 * folder. Case-insensitive, matching how Obsidian treats vault paths on
 * macOS/Windows. A prefix only matches at a path boundary, so `Code` ignores
 * `Code/x.md` but not `Codebase/x.md`.
 */
export function isPathIgnored(filePath: string | null | undefined, ignored: string[]): boolean {
  if (!filePath || ignored.length === 0) {
    return false;
  }
  const path = filePath.toLowerCase();
  return ignored.some((entry) => {
    const e = entry.toLowerCase();
    return path === e || path.startsWith(`${e}/`);
  });
}

/**
 * Per-note override read from frontmatter: `true` (force on), `false` (force
 * off), or `null` (no opinion — defer to the path list). Accepts boolean or the
 * common string spellings.
 */
export function frontmatterOverride(
  frontmatter: Record<string, unknown> | null | undefined,
): boolean | null {
  if (!frontmatter) {
    return null;
  }
  const value = frontmatter[IGNORE_FRONTMATTER_KEY];
  if (value === true || value === "true" || value === "on" || value === "yes") {
    return true;
  }
  if (value === false || value === "false" || value === "off" || value === "no") {
    return false;
  }
  return null;
}

/**
 * Whether typography correction should be disabled for a note. Frontmatter wins
 * over the path list; otherwise the path list decides.
 */
export function isCorrectionDisabled(
  filePath: string | null | undefined,
  ignoredPaths: string[],
  frontmatter: Record<string, unknown> | null | undefined,
): boolean {
  const override = frontmatterOverride(frontmatter);
  if (override !== null) {
    return !override;
  }
  return isPathIgnored(filePath, ignoredPaths);
}
