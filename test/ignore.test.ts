import { describe, expect, it } from "vitest";
import {
  frontmatterOverride,
  IGNORE_FRONTMATTER_KEY,
  isCorrectionDisabled,
  isPathIgnored,
  parseIgnoredPaths,
} from "../src/ignore";

describe("parseIgnoredPaths", () => {
  it("splits lines, trims, and drops blanks and comments", () => {
    expect(parseIgnoredPaths("Code\n  Templates/daily.md  \n\n# a comment\nSnippets")).toEqual([
      "Code",
      "Templates/daily.md",
      "Snippets",
    ]);
  });

  it("normalizes leading/trailing slashes", () => {
    expect(parseIgnoredPaths("/Code/\nTemplates//")).toEqual(["Code", "Templates"]);
  });

  it("returns an empty list for empty or whitespace-only input", () => {
    expect(parseIgnoredPaths("")).toEqual([]);
    expect(parseIgnoredPaths("\n   \n")).toEqual([]);
  });
});

describe("isPathIgnored", () => {
  const ignored = ["Code", "Templates/daily.md"];

  it("matches an exact file path", () => {
    expect(isPathIgnored("Templates/daily.md", ignored)).toBe(true);
  });

  it("matches files anywhere under an ignored folder", () => {
    expect(isPathIgnored("Code/snippet.md", ignored)).toBe(true);
    expect(isPathIgnored("Code/sub/deep.md", ignored)).toBe(true);
  });

  it("only matches at a path boundary, not a shared prefix", () => {
    expect(isPathIgnored("Codebase/x.md", ignored)).toBe(false);
  });

  it("does not match unrelated paths", () => {
    expect(isPathIgnored("Notes/x.md", ignored)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isPathIgnored("code/snippet.md", ignored)).toBe(true);
  });

  it("is false for an empty list or a missing path", () => {
    expect(isPathIgnored("Code/x.md", [])).toBe(false);
    expect(isPathIgnored(null, ignored)).toBe(false);
    expect(isPathIgnored(undefined, ignored)).toBe(false);
  });
});

describe("frontmatterOverride", () => {
  it("reads boolean and common string spellings", () => {
    expect(frontmatterOverride({ [IGNORE_FRONTMATTER_KEY]: false })).toBe(false);
    expect(frontmatterOverride({ [IGNORE_FRONTMATTER_KEY]: true })).toBe(true);
    expect(frontmatterOverride({ [IGNORE_FRONTMATTER_KEY]: "off" })).toBe(false);
    expect(frontmatterOverride({ [IGNORE_FRONTMATTER_KEY]: "on" })).toBe(true);
  });

  it("returns null when absent or unrecognized", () => {
    expect(frontmatterOverride({})).toBeNull();
    expect(frontmatterOverride(null)).toBeNull();
    expect(frontmatterOverride(undefined)).toBeNull();
    expect(frontmatterOverride({ [IGNORE_FRONTMATTER_KEY]: "maybe" })).toBeNull();
    expect(frontmatterOverride({ other: false })).toBeNull();
  });
});

describe("isCorrectionDisabled", () => {
  const ignored = ["Code"];

  it("disables inside an ignored folder", () => {
    expect(isCorrectionDisabled("Code/x.md", ignored, undefined)).toBe(true);
  });

  it("stays enabled elsewhere", () => {
    expect(isCorrectionDisabled("Notes/x.md", ignored, undefined)).toBe(false);
  });

  it("frontmatter false disables even outside ignored folders", () => {
    expect(isCorrectionDisabled("Notes/x.md", ignored, { [IGNORE_FRONTMATTER_KEY]: false })).toBe(
      true,
    );
  });

  it("frontmatter true re-enables inside an ignored folder", () => {
    expect(isCorrectionDisabled("Code/x.md", ignored, { [IGNORE_FRONTMATTER_KEY]: true })).toBe(
      false,
    );
  });
});
