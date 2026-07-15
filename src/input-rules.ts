import { type InputRule, type SmartTypographySettings } from "./types";

// Dashes
export const dashRules: InputRule[] = [
  // en dash
  {
    trigger: "-",
    from: "--",
    to: "–",
    contextMatch: /-$/u,
  },
  // em dash
  {
    trigger: "-",
    from: "–-",
    to: "—",
    contextMatch: /–$/u,
  },
  // tripple dash
  {
    trigger: "-",
    from: "—-",
    to: "---",
    contextMatch: /—$/u,
  },
];

export const dashRulesSansEnDash: InputRule[] = [
  // em dash
  {
    trigger: "-",
    from: "--",
    to: "—",
    contextMatch: /-$/u,
  },
  // tripple dash
  {
    trigger: "-",
    from: "—-",
    to: "---",
    contextMatch: /—$/u,
  },
];

// Ellipsis
export const ellipsisRules: InputRule[] = [
  {
    trigger: ".",
    from: "...",
    to: "…",
    contextMatch: /\.\.$/u,
  },
];

// Quotes
export const smartQuoteRules: InputRule[] = [
  // Open double
  {
    trigger: '"',
    from: '"',
    to: (settings) => settings.openDouble,
    contextMatch: /[\s{[(<'"‘“]$/u,
  },
  // Close double
  {
    trigger: '"',
    from: '"',
    to: (settings) => settings.closeDouble,
    contextMatch: /.*$/u,
  },
  // Paired double
  {
    trigger: '""',
    from: '""',
    to: (settings) => settings.openDouble + settings.closeDouble,
    contextMatch: /.*$/u,
  },
  // Open single
  {
    trigger: "'",
    from: "'",
    to: (settings) => settings.openSingle,
    contextMatch: /[\s{[(<'"‘“]$/u,
  },
  // Close single
  {
    trigger: "'",
    from: "'",
    to: (settings) => settings.closeSingle,
    contextMatch: /.*$/u,
  },
  // Paired single
  {
    trigger: "''",
    from: "''",
    to: (settings) => settings.openSingle + settings.closeSingle,
    contextMatch: /.*$/u,
  },
];

// Arrows
export const arrowRules: InputRule[] = [
  {
    trigger: "-",
    from: "<-",
    to: (settings) => settings.leftArrow,
    contextMatch: /<$/u,
  },
  {
    trigger: ">",
    from: "->",
    to: (settings) => settings.rightArrow,
    contextMatch: /-$/u,
  },
];

// Guillemet
export const guillemetRules: InputRule[] = [
  {
    trigger: "<",
    from: "<<",
    to: (settings) => settings.openGuillemet,
    contextMatch: /<$/u,
  },
  {
    trigger: ">",
    from: ">>",
    to: (settings) => settings.closeGuillemet,
    contextMatch: />$/u,
  },
];

// Comparisons
export const comparisonRules: InputRule[] = [
  {
    trigger: "=",
    from: ">=",
    to: "≥",
    contextMatch: />$/u,
  },
  {
    trigger: "=",
    from: "<=",
    to: "≤",
    contextMatch: /<$/u,
  },
  {
    trigger: "=",
    from: "/=",
    to: "≠",
    contextMatch: /\/$/u,
  },
];

// Fractions
export const fractionRules: InputRule[] = [
  {
    trigger: "2",
    from: "1/2",
    to: "½",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "3",
    from: "1/3",
    to: "⅓",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "3",
    from: "2/3",
    to: "⅔",
    contextMatch: /(?:^|\s)2\/$/u,
  },
  {
    trigger: "4",
    from: "1/4",
    to: "¼",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "4",
    from: "3/4",
    to: "¾",
    contextMatch: /(?:^|\s)3\/$/u,
  },
  {
    trigger: "5",
    from: "1/5",
    to: "⅕",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "5",
    from: "2/5",
    to: "⅖",
    contextMatch: /(?:^|\s)2\/$/u,
  },
  {
    trigger: "5",
    from: "3/5",
    to: "⅗",
    contextMatch: /(?:^|\s)3\/$/u,
  },
  {
    trigger: "5",
    from: "4/5",
    to: "⅘",
    contextMatch: /(?:^|\s)4\/$/u,
  },
  {
    trigger: "6",
    from: "1/6",
    to: "⅙",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "6",
    from: "5/6",
    to: "⅚",
    contextMatch: /(?:^|\s)5\/$/u,
  },
  {
    trigger: "7",
    from: "1/7",
    to: "⅐",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "8",
    from: "1/8",
    to: "⅛",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "8",
    from: "3/8",
    to: "⅜",
    contextMatch: /(?:^|\s)3\/$/u,
  },
  {
    trigger: "8",
    from: "5/8",
    to: "⅝",
    contextMatch: /(?:^|\s)5\/$/u,
  },
  {
    trigger: "8",
    from: "7/8",
    to: "⅞",
    contextMatch: /(?:^|\s)7\/$/u,
  },
  {
    trigger: "9",
    from: "1/9",
    to: "⅑",
    contextMatch: /(?:^|\s)1\/$/u,
  },
  {
    trigger: "0",
    from: "1/10",
    to: "⅒",
    contextMatch: /(?:^|\s)1\/1$/u,
  },
];

export interface InputRuleSet {
  inputRules: InputRule[];
  inputRuleMap: Record<string, InputRule[]>;
}

/**
 * Select the active CodeMirror 6 input rules for the given settings and group
 * them by trigger character. Pure: no dependency on the plugin instance or the
 * Obsidian runtime, so it can be unit-tested directly.
 *
 * Rule push order is significant — within a shared trigger the first rule whose
 * `contextMatch` matches wins, so the order here mirrors the original plugin.
 */
export function buildInputRules(settings: SmartTypographySettings): InputRuleSet {
  const inputRules: InputRule[] = [];

  if (settings.emDash) {
    inputRules.push(...(settings.skipEnDash ? dashRulesSansEnDash : dashRules));
  }

  if (settings.ellipsis) {
    inputRules.push(...ellipsisRules);
  }

  if (settings.curlyQuotes) {
    inputRules.push(...smartQuoteRules);
  }

  if (settings.arrows) {
    inputRules.push(...arrowRules);
  }

  if (settings.guillemets) {
    inputRules.push(...guillemetRules);
  }

  if (settings.comparisons) {
    inputRules.push(...comparisonRules);
  }

  if (settings.fractions) {
    inputRules.push(...fractionRules);
  }

  const inputRuleMap: Record<string, InputRule[]> = {};
  for (const rule of inputRules) {
    (inputRuleMap[rule.trigger] ??= []).push(rule);
  }

  return { inputRules, inputRuleMap };
}
