import { defineToolbarApp } from "astro/toolbar";

import {
  createElementPicker,
  formatElementLabel,
  isPickableElement,
  type SelectedElementSummary
} from "./core/selection.js";
import { createColorPickerShell } from "./ui/index.js";

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

  const picker = createElementPicker({
    onHover(summary) {
      if (!isPicking) {
        return;
      }

      selectedSummaryElement.textContent = summary
        ? `Hovering ${formatElementLabel(summary)}`
        : "Hover over the page to choose an element";
    },
    onSelect(summary) {
      selectedSummary = summary;
      isPicking = false;
      renderSelectedState(summary);
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
      isPicking = false;
      selectorInput.value = "";
      renderSelectedState(null);
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
    isPicking = false;
    picker.clear();
    selectorInput.value = "";
    setMode("Ready");
    setPickButtonLabel("Pick");
    renderSelectedState(null);
    statusMessage.textContent = "Selection cleared.";
  });

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
    picker.clear();
    selectorInput.value = "";
    setMode("Ready");
    setPickButtonLabel("Pick");
    renderSelectedState(null);
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
    renderSelectedState(summary);
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

  return {
    destroy: () => {
      picker.destroy();
      windowElement.remove();
    }
  };
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
