import type { AstroIntegration } from "astro";

import type { ColorPickerWidgetOptions } from "./types.js";

const integrationName = "astro-color-picker-widget";
const toolbarAppId = "astro-color-picker-widget";
const toolbarAppName = "Color Picker";
const toolbarAppIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 2.25a9.75 9.75 0 0 0 0 19.5h.62a2.58 2.58 0 0 0 1.73-4.49 1.08 1.08 0 0 1 .72-1.88h1.18A5.5 5.5 0 0 0 21.75 9.88C21.75 5.67 17.39 2.25 12 2.25Zm-4 9.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm3-4a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm2 11.5h-1a8.25 8.25 0 1 1 8.25-8.25 4 4 0 0 1-4 4h-1.18a2.58 2.58 0 0 0-1.73 4.49.92.92 0 0 1-.34-.24Zm2-11.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm3 4a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"/></svg>';

export function colorPickerWidget(
  options: ColorPickerWidgetOptions = {}
): AstroIntegration {
  return {
    name: integrationName,
    hooks: {
      "astro:config:setup": ({ addDevToolbarApp, command, logger }) => {
        if (options.enabled === false) {
          logger.debug("Color picker widget disabled by configuration.");
          return;
        }

        if (command !== "dev") {
          logger.debug("Color picker widget only registers during astro dev.");
          return;
        }

        addDevToolbarApp({
          id: toolbarAppId,
          name: toolbarAppName,
          icon: toolbarAppIcon,
          entrypoint: new URL("./app.js", import.meta.url)
        });
      }
    }
  };
}

export type { ColorPickerWidgetOptions } from "./types.js";

export default colorPickerWidget;
