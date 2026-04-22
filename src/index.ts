import type { AstroIntegration } from "astro";

import type { ColorPickerWidgetOptions } from "./types.js";

const integrationName = "astro-color-picker-widget";

export function colorPickerWidget(
  options: ColorPickerWidgetOptions = {}
): AstroIntegration {
  return {
    name: integrationName,
    hooks: {
      "astro:config:setup": ({ logger }) => {
        if (options.enabled === false) {
          logger.debug("Color picker widget disabled by configuration.");
        }
      }
    }
  };
}

export type { ColorPickerWidgetOptions } from "./types.js";

export default colorPickerWidget;
