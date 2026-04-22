import { defineToolbarApp } from "astro/toolbar";

import {
  createElementPicker,
  formatElementLabel,
  isPickableElement,
  type SelectedElementSummary
} from "./core/selection.js";
import {
  inspectElementColors,
  type InspectedColorProperty,
  type StyleInspection
} from "./core/styles.js";
import { createColorPickerShell } from "./ui/index.js";
import type { ColorProperty } from "./types.js";

interface ToolbarAppEventTargetLike {
  onToggled?: (callback: (event: { state: boolean }) => void) => void;
}

export interface ColorPickerAppHandle {
  destroy: () => void;
}

export function mountColorPickerApp(
  root: ShadowRoot,
  app?: ToolbarAppEventTargetLike
): ColorPickerAppHandle {
  const windowElement = createColorPickerShell();
  root.append(windowElement);

  let isPicking = false;
  let selectedSummary: SelectedElementSummary | null = null;
  let currentInspection: StyleInspection | null = null;

  const pickButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="pick-element"]'
  );
  const clearButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="clear-selection"]'
  );
  const selectedSummaryElement = getRequiredElement<HTMLElement>(
    windowElement,
    '[data-color-picker-widget="selected-summary"]'
  );
  const selectorInput = getRequiredElement<HTMLInputElement>(
    windowElement,
    '[data-color-picker-widget="selector-input"]'
  );
  const modeStatus = getRequiredElement<HTMLElement>(
    windowElement,
    '[data-color-picker-widget="mode-status"]'
  );
  const statusMessage = getRequiredElement<HTMLElement>(
    windowElement,
    '[data-color-picker-widget="status-message"]'
  );
  const colorInput = getRequiredElement<HTMLInputElement>(
    windowElement,
    '[data-color-picker-widget="color-input"]'
  );
  const hexInput = getRequiredElement<HTMLInputElement>(
    windowElement,
    '[data-color-picker-widget="hex-input"]'
  );
  const colorReadout = getRequiredElement<HTMLElement>(
    windowElement,
    '[data-color-picker-widget="color-readout"]'
  );
  const tokenSummary = getRequiredElement<HTMLElement>(
    windowElement,
    '[data-color-picker-widget="token-summary"]'
  );
  const currentSwatch = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-color-picker-widget="current-swatch"]'
  );
  const originalSwatch = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-color-picker-widget="original-swatch"]'
  );
  const propertyModeInputs = Array.from(
    windowElement.querySelectorAll<HTMLInputElement>(
      '[data-color-picker-widget="property-mode"]'
    )
  );

  const picker = createElementPicker({
    onHover(summary) {
      if (!isPicking) {
        return;
      }

      selectedSummaryElement.textContent = summary
        ? `Hovering ${formatElementLabel(summary)}`
        : "Hover over the page to choose an element";
    },
    onSelect(summary, element) {
      selectedSummary = summary;
      currentInspection = inspectElementColors(element);
      isPicking = false;
      renderSelectedState(summary);
      renderInspectedProperty();
      setMode("Selected");
      setPickButtonLabel("Pick");
      statusMessage.textContent = "Element selected.";
    },
    onCancel() {
      isPicking = false;
      setMode(selectedSummary ? "Selected" : "Ready");
      setPickButtonLabel("Pick");
      renderSelectedState(selectedSummary);
      statusMessage.textContent = "Picking canceled.";
    },
    onSelectionLost() {
      selectedSummary = null;
      currentInspection = null;
      isPicking = false;
      selectorInput.value = "";
      renderSelectedState(null);
      renderInspectedProperty();
      setMode("Ready");
      setPickButtonLabel("Pick");
      statusMessage.textContent = "Selected element is no longer on the page.";
    }
  });

  pickButton.addEventListener("click", () => {
    if (isPicking) {
      picker.stop();
      isPicking = false;
      setMode(selectedSummary ? "Selected" : "Ready");
      setPickButtonLabel("Pick");
      renderSelectedState(selectedSummary);
      statusMessage.textContent = "Picking canceled.";
      return;
    }

    isPicking = true;
    setMode("Picking");
    setPickButtonLabel("Cancel");
    selectedSummaryElement.textContent = "Hover over the page to choose an element";
    statusMessage.textContent = "Press Escape to cancel.";
    picker.start();
  });

  clearButton.addEventListener("click", () => {
    selectedSummary = null;
    currentInspection = null;
    isPicking = false;
    picker.clear();
    selectorInput.value = "";
    setMode("Ready");
    setPickButtonLabel("Pick");
    renderSelectedState(null);
    renderInspectedProperty();
    statusMessage.textContent = "Selection cleared.";
  });

  for (const input of propertyModeInputs) {
    input.addEventListener("change", renderInspectedProperty);
  }

  selectorInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    selectFromManualSelector(selectorInput.value);
  });

  selectorInput.addEventListener("change", () => {
    selectFromManualSelector(selectorInput.value);
  });

  app?.onToggled?.(({ state }) => {
    if (state) {
      return;
    }

    isPicking = false;
    selectedSummary = null;
    currentInspection = null;
    picker.clear();
    selectorInput.value = "";
    setMode("Ready");
    setPickButtonLabel("Pick");
    renderSelectedState(null);
    renderInspectedProperty();
    statusMessage.textContent = "";
  });

  function selectFromManualSelector(selector: string) {
    const trimmedSelector = selector.trim();
    if (!trimmedSelector) {
      return;
    }

    let element: Element | null = null;
    try {
      element = document.querySelector(trimmedSelector);
    } catch {
      statusMessage.textContent = "Selector is invalid.";
      return;
    }

    if (!element || !isPickableElement(element)) {
      statusMessage.textContent = "Selector did not match a selectable element.";
      return;
    }

    picker.stop();
    const summary = picker.select(element);
    selectedSummary = summary;
    currentInspection = inspectElementColors(element);
    renderSelectedState(summary);
    renderInspectedProperty();
    setMode("Selected");
    setPickButtonLabel("Pick");
    statusMessage.textContent = "Element selected.";
  }

  function renderSelectedState(summary: SelectedElementSummary | null) {
    clearButton.disabled = !summary;

    if (!summary) {
      selectedSummaryElement.textContent = "No element selected";
      return;
    }

    selectedSummaryElement.textContent = formatElementLabel(summary);
    selectorInput.value = summary.selector;
  }

  function setMode(mode: "Ready" | "Picking" | "Selected") {
    modeStatus.textContent = mode;
  }

  function setPickButtonLabel(label: string) {
    const labelElement = pickButton.lastElementChild;
    if (labelElement) {
      labelElement.textContent = label;
    }
  }

  function renderInspectedProperty() {
    if (!currentInspection) {
      colorReadout.textContent = "No element selected";
      colorInput.value = "#000000";
      hexInput.value = "";
      tokenSummary.textContent = "No variable detected";
      setSwatch(currentSwatch, "#000000", "Current", "Current");
      setSwatch(originalSwatch, "#000000", "Original", "Original");
      return;
    }

    const property = getSelectedColorProperty();
    const inspected = currentInspection.properties[property];
    const colorValue = inspected.displayValue;
    const hexValue = rgbToHex(colorValue);

    colorReadout.textContent = `${property}: ${colorValue}`;
    hexInput.value = hexValue ?? colorValue;
    if (hexValue) {
      colorInput.value = hexValue;
    }

    setSwatch(
      currentSwatch,
      hexValue ?? "#000000",
      `Current ${colorValue}`,
      "Current"
    );
    setSwatch(
      originalSwatch,
      rgbToHex(inspected.originalValue) ?? "#000000",
      `Original ${inspected.displayValue}`,
      "Original"
    );
    tokenSummary.textContent = formatTokenSummary(inspected);
  }

  function getSelectedColorProperty(): ColorProperty {
    const selected = propertyModeInputs.find((input) => input.checked)?.value;
    if (
      selected === "color" ||
      selected === "background-color" ||
      selected === "border-color"
    ) {
      return selected;
    }

    return "color";
  }

  function formatTokenSummary(inspected: InspectedColorProperty): string {
    if (!inspected.detectedVariable) {
      return inspected.transparent
        ? "No variable detected; computed value is transparent"
        : "No variable detected";
    }

    const variable = inspected.detectedVariable;
    const scope = variable.scope ? ` in ${variable.scope}` : "";
    return `${variable.name}${scope} resolves to ${
      variable.resolvedValue || inspected.displayValue
    }`;
  }

  return {
    destroy: () => {
      picker.destroy();
      windowElement.remove();
    }
  };
}

function setSwatch(
  button: HTMLButtonElement,
  value: string,
  label: string,
  visibleLabel: string
) {
  button.style.setProperty("--swatch", value);
  button.setAttribute("aria-label", label);
  const text = button.querySelector("span");
  if (text) {
    text.textContent = visibleLabel;
  }
}

function rgbToHex(value: string): string | undefined {
  const match = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (!match) {
    return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : undefined;
  }

  const [, red, green, blue] = match;
  return `#${[red, green, blue]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(Number(channel))))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

export default defineToolbarApp({
  init(canvas, app) {
    mountColorPickerApp(canvas, app);
  }
});

function getRequiredElement<T extends Element>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing color picker UI element: ${selector}`);
  }

  return element;
}
