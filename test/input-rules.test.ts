import {
  arrowRules,
  buildInputRules,
  comparisonRules,
  dashRules,
  dashRulesSansEnDash,
  ellipsisRules,
  fractionRules,
  guillemetRules,
  smartQuoteRules,
} from "../src/input-rules";
import { describe, expect, it } from "vitest";
import { type InputRule, type SmartTypographySettings } from "../src/types";

const ALL_ENABLED: SmartTypographySettings = {
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

const NONE_ENABLED: SmartTypographySettings = {
  ...ALL_ENABLED,
  curlyQuotes: false,
  emDash: false,
  ellipsis: false,
  arrows: false,
  guillemets: false,
  comparisons: false,
  fractions: false,
};

const resolve = (to: InputRule["to"], settings: SmartTypographySettings): string =>
  typeof to === "function" ? to(settings) : to;

describe("rule data — `to` resolvers read from settings", () => {
  const custom: SmartTypographySettings = {
    ...ALL_ENABLED,
    openDouble: "D",
    closeDouble: "d",
    openSingle: "S",
    closeSingle: "s",
    openGuillemet: "G",
    closeGuillemet: "g",
    leftArrow: "L",
    rightArrow: "R",
  };

  it("resolves smart-quote glyphs", () => {
    // order: openDouble, closeDouble, pairedDouble, openSingle, closeSingle, pairedSingle
    expect(smartQuoteRules.map((r) => resolve(r.to, custom))).toEqual([
      "D",
      "d",
      "Dd",
      "S",
      "s",
      "Ss",
    ]);
  });

  it("resolves arrow glyphs", () => {
    // order: leftArrow (<-), rightArrow (->)
    expect(arrowRules.map((r) => resolve(r.to, custom))).toEqual(["L", "R"]);
  });

  it("resolves guillemet glyphs", () => {
    expect(guillemetRules.map((r) => resolve(r.to, custom))).toEqual(["G", "g"]);
  });

  it("uses literal strings for dashes, ellipsis, comparisons and fractions", () => {
    expect(dashRules.map((r) => r.to)).toEqual(["–", "—", "---"]);
    expect(ellipsisRules.map((r) => r.to)).toEqual(["…"]);
    expect(comparisonRules.map((r) => r.to)).toEqual(["≥", "≤", "≠"]);
    expect(fractionRules).toHaveLength(18);
    expect(fractionRules[0]).toMatchObject({ from: "1/2", to: "½" });
  });
});

describe("rule data — contextMatch", () => {
  it("dash rules chain on the preceding dash glyph", () => {
    expect(dashRules[0].contextMatch.test("-")).toBe(true); // -- → en
    expect(dashRules[1].contextMatch.test("–")).toBe(true); // –- → em
    expect(dashRules[2].contextMatch.test("—")).toBe(true); // —- → ---
    expect(dashRules[0].contextMatch.test("a")).toBe(false);
  });

  it("ellipsis requires two preceding periods", () => {
    expect(ellipsisRules[0].contextMatch.test("..")).toBe(true);
    expect(ellipsisRules[0].contextMatch.test(".")).toBe(false);
  });

  it("open quote only after whitespace or an opening bracket/quote", () => {
    const openDouble = smartQuoteRules[0];
    for (const ctx of [" ", "(", "[", "{", "<", "“"]) {
      expect(openDouble.contextMatch.test(ctx)).toBe(true);
    }
    expect(openDouble.contextMatch.test("a")).toBe(false);
  });

  it("fraction needs `1/` at a word boundary", () => {
    const half = fractionRules[0];
    expect(half.contextMatch.test("1/")).toBe(true);
    expect(half.contextMatch.test(" 1/")).toBe(true);
    expect(half.contextMatch.test("x1/")).toBe(false);
  });
});

describe("buildInputRules", () => {
  it("includes every category when all flags are on", () => {
    const { inputRules } = buildInputRules(ALL_ENABLED);
    // dashes 3 + ellipsis 1 + quotes 6 + arrows 2 + guillemets 2 + comparisons 3 + fractions 18
    expect(inputRules).toHaveLength(35);
  });

  it("produces nothing when all flags are off", () => {
    const { inputRules, inputRuleMap } = buildInputRules(NONE_ENABLED);
    expect(inputRules).toHaveLength(0);
    expect(inputRuleMap).toEqual({});
  });

  it("maps each category to exactly its rules", () => {
    const only = (flag: keyof SmartTypographySettings, rules: InputRule[]) =>
      expect(buildInputRules({ ...NONE_ENABLED, [flag]: true }).inputRules).toEqual(rules);

    only("ellipsis", ellipsisRules);
    only("curlyQuotes", smartQuoteRules);
    only("arrows", arrowRules);
    only("guillemets", guillemetRules);
    only("comparisons", comparisonRules);
    only("fractions", fractionRules);
    only("emDash", dashRules);
  });

  it("swaps the en-dash rule set when skipEnDash is on", () => {
    const withEn = buildInputRules({ ...NONE_ENABLED, emDash: true, skipEnDash: false });
    expect(withEn.inputRuleMap["-"].some((r) => r.from === "--" && r.to === "–")).toBe(true);

    const noEn = buildInputRules({ ...NONE_ENABLED, emDash: true, skipEnDash: true });
    expect(noEn.inputRules).toEqual(dashRulesSansEnDash);
    expect(noEn.inputRuleMap["-"].some((r) => r.from === "--" && r.to === "—")).toBe(true);
    expect(noEn.inputRuleMap["-"].some((r) => r.to === "–")).toBe(false);
  });

  it("groups rules by trigger, preserving push order across categories", () => {
    const { inputRuleMap } = buildInputRules(ALL_ENABLED);

    // `-` is shared by the dash rules and the left-arrow rule; dashes come first.
    expect(inputRuleMap["-"].map((r) => r.from)).toEqual(["--", "–-", "—-", "<-"]);
    // `>` is shared by the right-arrow and close-guillemet rules; arrows come first.
    expect(inputRuleMap[">"].map((r) => r.from)).toEqual(["->", ">>"]);
    expect(inputRuleMap["="].map((r) => r.from)).toEqual([">=", "<=", "/="]);
    expect(inputRuleMap['"'].map((r) => r.from)).toEqual(['"', '"']);
    expect(inputRuleMap['""']).toHaveLength(1);
    expect(inputRuleMap["<"].map((r) => r.from)).toEqual(["<<"]);
  });
});
