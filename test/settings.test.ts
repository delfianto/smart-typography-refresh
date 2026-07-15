import {
  DEFAULT_SETTINGS,
  type SmartTypographyPlugin,
  SmartTypographySettingTab,
} from "../src/settings";
import { describe, expect, it, vi } from "vitest";
import { type App } from "obsidian";

describe("DEFAULT_SETTINGS", () => {
  it("matches the documented defaults", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      curlyQuotes: true,
      emDash: true,
      ellipsis: true,
      arrows: true,
      comparisons: true,
      fractions: false,
      guillemets: false,
      skipEnDash: false,
      ignoredPaths: "",
      openDouble: "“",
      closeDouble: "”",
      openSingle: "‘",
      closeSingle: "’",
      openGuillemet: "«",
      closeGuillemet: "»",
      leftArrow: "←",
      rightArrow: "→",
    });
  });
});

// The mock Setting (test/__mocks__/obsidian.ts) records each Setting on the
// container and captures its toggle/text onChange handler so we can drive them.
interface MockSetting {
  name: string;
  toggle?: { changeHandler?: (value: boolean) => unknown };
  text?: { changeHandler?: (value: string) => unknown };
  textArea?: { changeHandler?: (value: string) => unknown };
}

function renderTab() {
  const settings = { ...DEFAULT_SETTINGS };
  const saveSettings = vi.fn(async () => {});
  const plugin = { settings, saveSettings } as unknown as SmartTypographyPlugin;
  const tab = new SmartTypographySettingTab({} as App, plugin);
  tab.display();
  const created = (tab.containerEl as unknown as { settings: MockSetting[] }).settings;
  const find = (name: string): MockSetting => {
    const setting = created.find((s) => s.name === name);
    if (!setting) throw new Error(`Setting "${name}" was not rendered`);
    return setting;
  };
  return { settings, saveSettings, find };
}

describe("SmartTypographySettingTab wiring", () => {
  it("renders a setting for every feature toggle", () => {
    const { find } = renderTab();
    for (const name of [
      "Curly Quotes",
      "Dashes",
      "Skip en-dash",
      "Ellipsis",
      "Guillemets",
      "Arrows",
      "Comparison",
      "Fractions",
    ]) {
      expect(find(name).toggle).toBeDefined();
    }
  });

  it("toggling a feature updates settings and persists", async () => {
    const { settings, saveSettings, find } = renderTab();
    await find("Curly Quotes").toggle!.changeHandler!(false);
    expect(settings.curlyQuotes).toBe(false);
    expect(saveSettings).toHaveBeenCalledTimes(1);

    await find("Fractions").toggle!.changeHandler!(true);
    expect(settings.fractions).toBe(true);
    expect(saveSettings).toHaveBeenCalledTimes(2);
  });

  it("updates the ignored-paths list and persists", async () => {
    const { settings, saveSettings, find } = renderTab();
    await find("Ignored paths").textArea!.changeHandler!("Code\nTemplates/daily.md");
    expect(settings.ignoredPaths).toBe("Code\nTemplates/daily.md");
    expect(saveSettings).toHaveBeenCalledTimes(1);
  });

  it("accepts a single-character glyph override", async () => {
    const { settings, saveSettings, find } = renderTab();
    await find("Open double quote character").text!.changeHandler!("«");
    expect(settings.openDouble).toBe("«");
    expect(saveSettings).toHaveBeenCalledTimes(1);
  });

  it("rejects multi-character input for single-char glyph fields", async () => {
    const { settings, saveSettings, find } = renderTab();
    await find("Left arrow character").text!.changeHandler!("=>");
    expect(settings.leftArrow).toBe(DEFAULT_SETTINGS.leftArrow); // unchanged
    expect(saveSettings).not.toHaveBeenCalled();
  });
});
