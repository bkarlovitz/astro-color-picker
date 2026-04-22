import { describe, expect, it, vi } from "vitest";

import colorPickerWidget from "../src/index.js";
import {
  formatCssDeclaration,
  formatCssDeclarations
} from "../src/core/export.js";
import {
  clearColorPickerSession,
  getStorageKey,
  loadColorPickerSession,
  saveColorPickerSession
} from "../src/core/storage.js";
import { isSupportedColorInput } from "../src/core/colors.js";
import { createStyleMutationManager } from "../src/core/mutations.js";
import {
  extractCssVariableName,
  formatDisplayColorValue,
  isTransparentColor
} from "../src/core/styles.js";
import type { ColorPickerWidgetOptions } from "../src/types.js";
import { supportedColorProperties } from "../src/types.js";

type ConfigSetupHook = NonNullable<
  ReturnType<typeof colorPickerWidget>["hooks"]["astro:config:setup"]
>;

function runConfigSetup(
  command: "dev" | "build",
  options: ColorPickerWidgetOptions = {}
) {
  const integration = colorPickerWidget(options);
  const configSetup = integration.hooks["astro:config:setup"];
  if (!configSetup) {
    throw new Error("Expected astro:config:setup hook to exist.");
  }

  const addDevToolbarApp = vi.fn();
  const logger = {
    debug: vi.fn()
  };

  configSetup({
    command,
    addDevToolbarApp,
    logger
  } as unknown as Parameters<ConfigSetupHook>[0]);

  return { addDevToolbarApp, logger };
}

describe("Phase 0 scaffold", () => {
  it("exposes the initial supported color properties", () => {
    expect(supportedColorProperties).toEqual([
      "color",
      "background-color",
      "border-color"
    ]);
  });

  it("formats a deterministic CSS declaration block", () => {
    expect(
      formatCssDeclaration({
        selector: ".button",
        property: "background-color",
        value: "#2b7fff"
      })
    ).toBe(".button {\n  background-color: #2b7fff;\n}");
  });

  it("recognizes first-version color inputs", () => {
    expect(isSupportedColorInput("#fff")).toBe(true);
    expect(isSupportedColorInput("rgb(255 255 255)")).toBe(true);
    expect(isSupportedColorInput("hsl(210 100% 50%)")).toBe(true);
    expect(isSupportedColorInput("oklch(0.7 0.2 260)")).toBe(false);
  });

  it("scopes storage keys by origin and pathname", () => {
    expect(getStorageKey("https://example.test", "/demo")).toBe(
      "astro-color-picker-widget:https://example.test:/demo"
    );
  });

  it("normalizes transparent color display values", () => {
    expect(isTransparentColor("rgba(0, 0, 0, 0)")).toBe(true);
    expect(isTransparentColor("rgb(255 255 255 / 0)")).toBe(true);
    expect(formatDisplayColorValue("")).toBe("transparent");
  });

  it("extracts CSS variable names from color declarations", () => {
    expect(extractCssVariableName("var(--demo-accent)")).toBe("--demo-accent");
    expect(extractCssVariableName("rgb(0 0 0)")).toBeUndefined();
  });
});

describe("Phase 1 toolbar registration", () => {
  it("registers the Astro Dev Toolbar app during dev", () => {
    const { addDevToolbarApp } = runConfigSetup("dev");

    expect(addDevToolbarApp).toHaveBeenCalledOnce();
    expect(addDevToolbarApp).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "astro-color-picker-widget",
        name: "Color Picker",
        icon: expect.stringContaining("<svg"),
        entrypoint: expect.any(URL)
      })
    );

    const [registeredApp] = addDevToolbarApp.mock.calls[0] as [
      { entrypoint: URL }
    ];
    expect(registeredApp.entrypoint.pathname).toMatch(/\/app\.js$/);
  });

  it("does not register the toolbar app during build", () => {
    const { addDevToolbarApp } = runConfigSetup("build");

    expect(addDevToolbarApp).not.toHaveBeenCalled();
  });

  it("does not register the toolbar app when disabled", () => {
    const { addDevToolbarApp, logger } = runConfigSetup("dev", {
      enabled: false
    });

    expect(addDevToolbarApp).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      "Color picker widget disabled by configuration."
    );
  });
});

describe("Phase 5 mutation tracking", () => {
  class FakeStyleDeclaration {
    private readonly values = new Map<string, string>();

    getPropertyValue(property: string) {
      return this.values.get(property) ?? "";
    }

    setProperty(property: string, value: string) {
      this.values.set(property, value);
    }

    removeProperty(property: string) {
      this.values.delete(property);
    }
  }

  class FakeHTMLElement {
    style = new FakeStyleDeclaration();
  }

  (globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement =
    FakeHTMLElement as unknown as typeof HTMLElement;

  it("restores original inline style values", () => {
    const manager = createStyleMutationManager();
    const element = new FakeHTMLElement() as unknown as HTMLElement;
    element.style.setProperty("color", "red");

    manager.apply(element, "color", "blue");
    expect(element.style.getPropertyValue("color")).toBe("blue");

    manager.reset(element, "color");
    expect(element.style.getPropertyValue("color")).toBe("red");
  });

  it("removes preview styles that were not originally inline", () => {
    const manager = createStyleMutationManager();
    const element = new FakeHTMLElement() as unknown as HTMLElement;

    manager.apply(element, "background-color", "#ffffff");
    expect(element.style.getPropertyValue("background-color")).toBe("#ffffff");

    manager.resetAll();
    expect(element.style.getPropertyValue("background-color")).toBe("");
  });
});

describe("Phase 6 copy and persistence helpers", () => {
  class FakeStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string) {
      return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string) {
      this.values.set(key, value);
    }

    removeItem(key: string) {
      this.values.delete(key);
    }
  }

  const location = {
    origin: "https://example.test",
    pathname: "/colors"
  } as Location;

  it("groups copied CSS changes by selector in insertion order", () => {
    expect(
      formatCssDeclarations([
        {
          selector: ".button",
          property: "color",
          value: "#111111"
        },
        {
          selector: ".button",
          property: "background-color",
          value: "#ffffff"
        },
        {
          selector: ":root",
          property: "--accent",
          value: "#2563eb"
        }
      ])
    ).toBe(
      ".button {\n  color: #111111;\n  background-color: #ffffff;\n}\n\n:root {\n  --accent: #2563eb;\n}"
    );
  });

  it("round-trips a page-scoped persisted session", () => {
    const storage = new FakeStorage() as unknown as Storage;

    saveColorPickerSession(storage, location, {
      version: 1,
      recentColors: ["#2563eb"],
      changes: [
        {
          selector: ".button",
          property: "background-color",
          value: "#ffffff"
        }
      ]
    });

    expect(loadColorPickerSession(storage, location)).toEqual({
      version: 1,
      recentColors: ["#2563eb"],
      changes: [
        {
          selector: ".button",
          property: "background-color",
          value: "#ffffff"
        }
      ]
    });

    clearColorPickerSession(storage, location);
    expect(loadColorPickerSession(storage, location)).toEqual({
      version: 1,
      recentColors: [],
      changes: []
    });
  });

  it("falls back to an empty session for invalid persisted data", () => {
    const storage = new FakeStorage() as unknown as Storage;
    storage.setItem(getStorageKey(location.origin, location.pathname), "{");

    expect(loadColorPickerSession(storage, location)).toEqual({
      version: 1,
      recentColors: [],
      changes: []
    });
  });
});
