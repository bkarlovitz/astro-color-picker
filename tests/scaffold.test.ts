import { describe, expect, it, vi } from "vitest";

import colorPickerWidget from "../src/index.js";
import { formatCssDeclaration } from "../src/core/export.js";
import { getStorageKey } from "../src/core/storage.js";
import { isSupportedColorInput } from "../src/core/colors.js";
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
