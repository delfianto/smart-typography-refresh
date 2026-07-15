export interface SmartTypographySettings {
  curlyQuotes: boolean;
  emDash: boolean;
  ellipsis: boolean;
  arrows: boolean;
  guillemets: boolean;
  comparisons: boolean;
  fractions: boolean;
  skipEnDash: boolean;

  // Newline-separated vault paths (files/folders) excluded from correction.
  ignoredPaths: string;

  openSingle: string;
  closeSingle: string;
  openDouble: string;
  closeDouble: string;
  openGuillemet: string;
  closeGuillemet: string;
  leftArrow: string;
  rightArrow: string;
}

export interface InputRule {
  trigger: string;
  contextMatch: RegExp;
  from: string;
  to: string | ((settings: SmartTypographySettings) => string);
}
