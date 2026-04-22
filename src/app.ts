import { defineToolbarApp } from "astro/toolbar";

import { createColorPickerShell } from "./ui/index.js";

export interface ColorPickerAppHandle {
  destroy: () => void;
}

export function mountColorPickerApp(root: ShadowRoot): ColorPickerAppHandle {
  const windowElement = createColorPickerShell();
  root.append(windowElement);

  return {
    destroy: () => {
      windowElement.remove();
    }
  };
}

export default defineToolbarApp({
  init(canvas) {
    mountColorPickerApp(canvas);
  }
});
