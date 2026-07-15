import {
  DEFAULT_SETTINGS,
  type SmartTypographyPlugin,
  SmartTypographySettingTab,
} from "./settings";
import { editorInfoField, Plugin } from "obsidian";
import { type InputRule, type SmartTypographySettings } from "./types";
import { isCorrectionDisabled, parseIgnoredPaths } from "./ignore";
import { buildInputRules } from "./input-rules";
import { createTypographyExtension } from "./editor-extension";
import { type EditorState } from "@codemirror/state";

export default class SmartTypography extends Plugin implements SmartTypographyPlugin {
  declare settings: SmartTypographySettings;
  inputRuleMap: Record<string, InputRule[]> = {};
  private ignoredPaths: string[] = [];

  override async onload() {
    await this.loadSettings();

    this.addSettingTab(new SmartTypographySettingTab(this.app, this));

    this.registerEditorExtension(
      createTypographyExtension(
        () => this.inputRuleMap,
        () => this.settings,
        (state) => this.isEditorIgnored(state),
      ),
    );
  }

  // Whether the file open in this editor is excluded from correction — by the
  // ignored-paths list or a per-note `smart-typography` frontmatter property.
  // `editorInfoField` gives the file for *this* editor (not just the active one).
  private isEditorIgnored(state: EditorState): boolean {
    const file = state.field(editorInfoField, false)?.file;
    if (!file) {
      return false;
    }
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    return isCorrectionDisabled(file.path, this.ignoredPaths, frontmatter);
  }

  private rebuildFromSettings() {
    this.inputRuleMap = buildInputRules(this.settings).inputRuleMap;
    this.ignoredPaths = parseIgnoredPaths(this.settings.ignoredPaths);
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.rebuildFromSettings();
  }

  async saveSettings() {
    this.rebuildFromSettings();
    await this.saveData(this.settings);
  }
}
