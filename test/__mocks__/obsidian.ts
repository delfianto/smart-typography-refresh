// Minimal stub of the Obsidian runtime API for vitest. Only the symbols the
// code-under-test imports need to exist. The settings tab is exercised through
// chainable Setting / Toggle / Text stubs that capture the onChange handlers so
// a test can drive them and assert the resulting settings mutations.

export class App {}

export class Plugin {
  app: App;
  constructor(app?: App) {
    this.app = app ?? new App();
  }
}

class MockToggleComponent {
  value = false;
  changeHandler: ((value: boolean) => unknown) | undefined;
  setValue(value: boolean): this {
    this.value = value;
    return this;
  }
  onChange(handler: (value: boolean) => unknown): this {
    this.changeHandler = handler;
    return this;
  }
}

class MockTextComponent {
  value = "";
  changeHandler: ((value: string) => unknown) | undefined;
  setValue(value: string): this {
    this.value = value;
    return this;
  }
  onChange(handler: (value: string) => unknown): this {
    this.changeHandler = handler;
    return this;
  }
}

export class Setting {
  name = "";
  desc = "";
  toggle: MockToggleComponent | undefined;
  text: MockTextComponent | undefined;
  textArea: MockTextComponent | undefined;

  constructor(containerEl: { settings: Setting[] }) {
    containerEl.settings.push(this);
  }
  setName(name: string): this {
    this.name = name;
    return this;
  }
  setDesc(desc: string): this {
    this.desc = desc;
    return this;
  }
  addToggle(cb: (toggle: MockToggleComponent) => unknown): this {
    this.toggle = new MockToggleComponent();
    cb(this.toggle);
    return this;
  }
  addText(cb: (text: MockTextComponent) => unknown): this {
    this.text = new MockTextComponent();
    cb(this.text);
    return this;
  }
  addTextArea(cb: (text: MockTextComponent) => unknown): this {
    this.textArea = new MockTextComponent();
    cb(this.textArea);
    return this;
  }
}

class MockContainer {
  settings: Setting[] = [];
  empty(): void {
    this.settings = [];
  }
}

export class PluginSettingTab {
  app: App;
  plugin: unknown;
  containerEl: MockContainer;
  constructor(app: App, plugin: unknown) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = new MockContainer();
  }
}
