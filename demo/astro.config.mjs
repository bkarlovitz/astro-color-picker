import { defineConfig } from "astro/config";
import colorPickerWidget from "astro-color-picker-widget";

export default defineConfig({
  integrations: [colorPickerWidget()]
});
