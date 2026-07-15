import { type App, type Plugin, PluginSettingTab, Setting } from "obsidian";

import { type SmartTypographySettings } from "./types";

export const DEFAULT_SETTINGS: SmartTypographySettings = {
  curlyQuotes: true,
  emDash: true,
  ellipsis: true,
  arrows: true,
  comparisons: true,
  fractions: false,
  guillemets: false,
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

/**
 * The slice of the plugin the settings tab needs. Lets `settings.ts` stay
 * decoupled from `main.ts` (no circular import) while still passing a real
 * `Plugin` to `PluginSettingTab`'s constructor.
 */
export interface SmartTypographyPlugin extends Plugin {
  settings: SmartTypographySettings;
  saveSettings: () => Promise<void>;
}

export class SmartTypographySettingTab extends PluginSettingTab {
  plugin: SmartTypographyPlugin;

  constructor(app: App, plugin: SmartTypographyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Ignored paths")
      .setDesc(
        'Disable all corrections in these files and folders — one vault-relative path per line (e.g. "Code" or "Templates/daily.md"). Everything under a listed folder is ignored. Override per note with a smart-typography: false (or true) frontmatter property.',
      )
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.ignoredPaths).onChange(async (value) => {
          this.plugin.settings.ignoredPaths = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Curly Quotes")
      .setDesc("Double and single quotes will be converted to curly quotes (“” & ‘’)")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.curlyQuotes).onChange(async (value) => {
          this.plugin.settings.curlyQuotes = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName("Open double quote character").addText((text) => {
      text.setValue(this.plugin.settings.openDouble).onChange(async (value) => {
        if (!value) return;
        if (value.length > 1) {
          text.setValue(value[0]);
          return;
        }

        this.plugin.settings.openDouble = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("Close double quote character").addText((text) => {
      text.setValue(this.plugin.settings.closeDouble).onChange(async (value) => {
        if (!value) return;
        if (value.length > 1) {
          text.setValue(value[0]);
          return;
        }
        this.plugin.settings.closeDouble = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("Open single quote character").addText((text) => {
      text.setValue(this.plugin.settings.openSingle).onChange(async (value) => {
        if (!value) return;
        if (value.length > 1) {
          text.setValue(value[0]);
          return;
        }
        this.plugin.settings.openSingle = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("Close single quote character").addText((text) => {
      text.setValue(this.plugin.settings.closeSingle).onChange(async (value) => {
        if (!value) return;
        if (value.length > 1) {
          text.setValue(value[0]);
          return;
        }
        this.plugin.settings.closeSingle = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName("Dashes")
      .setDesc(
        "Two dashes (--) will be converted to an en-dash (–). And en-dash followed by a dash will be converted to and em-dash (—). An em-dash followed by a dash will be converted into three dashes (---)",
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.emDash).onChange(async (value) => {
          this.plugin.settings.emDash = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Skip en-dash")
      .setDesc("When enabled, two dashes will be converted to an em-dash rather than an en-dash.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.skipEnDash).onChange(async (value) => {
          this.plugin.settings.skipEnDash = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Ellipsis")
      .setDesc("Three periods (...) will be converted to an ellipses (…)")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.ellipsis).onChange(async (value) => {
          this.plugin.settings.ellipsis = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Guillemets")
      .setDesc("<< | >> will be converted to « | »")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.guillemets).onChange(async (value) => {
          this.plugin.settings.guillemets = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName("Open guillemet").addText((text) => {
      text.setValue(this.plugin.settings.openGuillemet).onChange(async (value) => {
        if (!value) return;

        this.plugin.settings.openGuillemet = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("Close guillemet").addText((text) => {
      text.setValue(this.plugin.settings.closeGuillemet).onChange(async (value) => {
        if (!value) return;

        this.plugin.settings.closeGuillemet = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName("Arrows")
      .setDesc("<- | -> will be converted to ← | →")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.arrows).onChange(async (value) => {
          this.plugin.settings.arrows = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName("Left arrow character").addText((text) => {
      text.setValue(this.plugin.settings.leftArrow).onChange(async (value) => {
        if (!value) return;
        if (value.length > 1) {
          text.setValue(value[0]);
          return;
        }
        this.plugin.settings.leftArrow = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("Right arrow character").addText((text) => {
      text.setValue(this.plugin.settings.rightArrow).onChange(async (value) => {
        if (!value) return;
        if (value.length > 1) {
          text.setValue(value[0]);
          return;
        }
        this.plugin.settings.rightArrow = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName("Comparison")
      .setDesc("<= | >= | /= will be converted to ≤ | ≥ | ≠")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.comparisons).onChange(async (value) => {
          this.plugin.settings.comparisons = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Fractions")
      .setDesc(
        "1/2 will be converted to ½. Supported UTF-8 fractions: ½, ⅓, ⅔, ¼, ¾, ⅕, ⅖, ⅗, ⅘, ⅙, ⅚, ⅐, ⅛, ⅜, ⅝, ⅞, ⅑, ⅒",
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.fractions).onChange(async (value) => {
          this.plugin.settings.fractions = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
