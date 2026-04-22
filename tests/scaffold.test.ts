import { describe, expect, it } from "vitest";

import { formatCssDeclaration } from "../src/core/export.js";
import { getStorageKey } from "../src/core/storage.js";
import { isSupportedColorInput } from "../src/core/colors.js";
import { supportedColorProperties } from "../src/types.js";

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
