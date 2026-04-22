export interface ColorPickerAppHandle {
  destroy: () => void;
}

export function mountColorPickerApp(root: ShadowRoot): ColorPickerAppHandle {
  const container = document.createElement("div");
  container.dataset.colorPickerWidget = "root";
  root.append(container);

  return {
    destroy: () => {
      container.remove();
    }
  };
}
