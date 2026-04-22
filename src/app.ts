import { defineToolbarApp } from "astro/toolbar";

export interface ColorPickerAppHandle {
  destroy: () => void;
}

export function mountColorPickerApp(root: ShadowRoot): ColorPickerAppHandle {
  const container = document.createElement("div");
  container.dataset.colorPickerWidget = "root";
  container.textContent = "Color Picker";
  root.append(container);

  return {
    destroy: () => {
      container.remove();
    }
  };
}

export default defineToolbarApp({
  init(canvas) {
    mountColorPickerApp(canvas);
  }
});
