import { defineToolbarApp } from "astro/toolbar";

import {
  createElementPicker,
  formatElementLabel,
  generateSelector,
  isPickableElement,
  type SelectedElementSummary
} from "./core/selection.js";
import {
  createStyleMutationManager,
  type StyleMutationRecord
} from "./core/mutations.js";
import {
  formatCssDeclarations,
  formatCssVariableAssignment,
  type CssDeclarationChange
} from "./core/export.js";
import {
  clearColorPickerSession,
  loadColorPickerSession,
  saveColorPickerSession,
  type PersistedColorPickerSession,
  type PersistedStyleChange
} from "./core/storage.js";
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
  let selectedElement: Element | null = null;
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
  const opacityInput = getRequiredElement<HTMLInputElement>(
    windowElement,
    '[data-color-picker-widget="opacity-input"]'
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
  const editVariableToggle = getRequiredElement<HTMLInputElement>(
    windowElement,
    '[data-color-picker-widget="edit-variable-toggle"]'
  );
  const resetPropertyButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="reset-property"]'
  );
  const resetAllButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="reset-all"]'
  );
  const copyCssButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="copy-css"]'
  );
  const copyAllButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="copy-all"]'
  );
  const copyTokenButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="copy-token"]'
  );
  const clearSavedButton = getRequiredElement<HTMLButtonElement>(
    windowElement,
    '[data-action="clear-saved"]'
  );
  const recentSwatches = Array.from(
    windowElement.querySelectorAll<HTMLButtonElement>(
      '[data-color-picker-widget="recent-swatch"]'
    )
  );
  const propertyModeInputs = Array.from(
    windowElement.querySelectorAll<HTMLInputElement>(
      '[data-color-picker-widget="property-mode"]'
    )
  );
  const mutations = createStyleMutationManager();
  let persistedSession = loadSession();
  let recentColors = persistedSession.recentColors;

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
      selectedElement = element;
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
      selectedElement = null;
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
    selectedElement = null;
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
    input.addEventListener("change", () => {
      editVariableToggle.checked = false;
      renderInspectedProperty();
    });
  }

  colorInput.addEventListener("input", () => {
    hexInput.value = colorInput.value;
    applyCurrentPreview();
  });

  hexInput.addEventListener("input", () => {
    applyCurrentPreview();
  });

  opacityInput.addEventListener("input", () => {
    applyCurrentPreview();
  });

  editVariableToggle.addEventListener("change", () => {
    applyCurrentPreview();
  });

  resetPropertyButton.addEventListener("click", () => {
    resetCurrentProperty();
  });

  resetAllButton.addEventListener("click", () => {
    mutations.resetAll();
    persistSession();
    refreshInspection();
    renderInspectedProperty();
    statusMessage.textContent = "All preview changes reset.";
  });

  copyCssButton.addEventListener("click", () => {
    const change = getCurrentDeclarationChange();
    if (!change) {
      statusMessage.textContent = "No current preview change to copy.";
      return;
    }

    void copyText(formatCssDeclarations([change]), "CSS copied.");
  });

  copyAllButton.addEventListener("click", () => {
    const changes = getAllDeclarationChanges();
    if (changes.length === 0) {
      statusMessage.textContent = "No preview changes to copy.";
      return;
    }

    void copyText(formatCssDeclarations(changes), "All CSS changes copied.");
  });

  copyTokenButton.addEventListener("click", () => {
    const change = getCurrentDeclarationChange();
    if (!change || !change.property.startsWith("--")) {
      statusMessage.textContent = "No current token change to copy.";
      return;
    }

    void copyText(formatCssVariableAssignment(change), "Token copied.");
  });

  clearSavedButton.addEventListener("click", () => {
    clearPersistedSession();
    recentColors = [];
    persistedSession = {
      version: 1,
      recentColors,
      changes: []
    };
    renderRecentColors();
    renderInspectedProperty();
    statusMessage.textContent = "Saved session cleared.";
  });

  for (const swatch of recentSwatches) {
    swatch.addEventListener("click", () => {
      const color = swatch.dataset.colorValue;
      if (!color) {
        return;
      }

      hexInput.value = color;
      const hexColor = rgbToHex(color) ?? color;
      if (/^#[0-9a-f]{6}$/i.test(hexColor)) {
        colorInput.value = hexColor;
      }
      applyCurrentPreview();
    });
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
      restorePersistedSession();
      return;
    }

    isPicking = false;
    selectedSummary = null;
    selectedElement = null;
    currentInspection = null;
    mutations.resetAll();
    picker.clear();
    selectorInput.value = "";
    setMode("Ready");
    setPickButtonLabel("Pick");
    renderSelectedState(null);
    renderInspectedProperty();
    statusMessage.textContent = "";
  });

  restorePersistedSession();

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
    selectedElement = element;
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
      editVariableToggle.checked = false;
      editVariableToggle.disabled = true;
      resetPropertyButton.disabled = true;
      resetAllButton.disabled = !mutations.hasMutation();
      copyCssButton.disabled = true;
      copyAllButton.disabled = !mutations.hasMutation();
      copyTokenButton.disabled = true;
      clearSavedButton.disabled = !hasPersistedSession();
      renderRecentColors();
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
    editVariableToggle.disabled = !inspected.detectedVariable;
    if (!inspected.detectedVariable) {
      editVariableToggle.checked = false;
    }
    resetPropertyButton.disabled = !hasCurrentPropertyMutation();
    resetAllButton.disabled = !mutations.hasMutation();
    copyCssButton.disabled = !hasCurrentPropertyMutation();
    copyAllButton.disabled = !mutations.hasMutation();
    copyTokenButton.disabled = !hasCurrentTokenMutation();
    clearSavedButton.disabled = !hasPersistedSession();
    renderRecentColors();
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

  function applyCurrentPreview() {
    if (!selectedElement || !currentInspection) {
      statusMessage.textContent = "Select an element before editing colors.";
      return;
    }

    const value = getPreviewColorValue();
    if (!value) {
      statusMessage.textContent = "Enter a supported color value.";
      return;
    }

    const property = getSelectedColorProperty();
    const inspected = currentInspection.properties[property];
    const variable = inspected.detectedVariable;

    if (editVariableToggle.checked && variable) {
      const target = variable.scopeElement ?? selectedElement;
      mutations.apply(target, variable.name, value);
      statusMessage.textContent = `Previewing ${variable.name}.`;
    } else {
      mutations.apply(selectedElement, property, value);
      statusMessage.textContent = `Previewing ${property}.`;
    }

    rememberRecentColor(value);
    persistSession();
    refreshInspection();
    renderInspectedProperty();
  }

  function resetCurrentProperty() {
    if (!selectedElement || !currentInspection) {
      return;
    }

    const property = getSelectedColorProperty();
    const inspected = currentInspection.properties[property];
    const variable = inspected.detectedVariable;
    const target =
      editVariableToggle.checked && variable
        ? variable.scopeElement ?? selectedElement
        : selectedElement;
    const mutationProperty =
      editVariableToggle.checked && variable ? variable.name : property;

    if (mutations.reset(target, mutationProperty)) {
      statusMessage.textContent = "Current preview change reset.";
    }

    persistSession();
    refreshInspection();
    renderInspectedProperty();
  }

  function refreshInspection() {
    if (selectedElement) {
      currentInspection = preserveOriginalValues(
        inspectElementColors(selectedElement),
        currentInspection
      );
    }
  }

  function hasCurrentPropertyMutation() {
    if (!selectedElement || !currentInspection) {
      return false;
    }

    const property = getSelectedColorProperty();
    const variable = currentInspection.properties[property].detectedVariable;
    if (editVariableToggle.checked && variable) {
      return mutations.hasMutation(variable.scopeElement ?? selectedElement, variable.name);
    }

    return mutations.hasMutation(selectedElement, property);
  }

  function hasCurrentTokenMutation() {
    const change = getCurrentDeclarationChange();
    return Boolean(change?.property.startsWith("--"));
  }

  function getCurrentMutationRecord(): StyleMutationRecord | undefined {
    if (!selectedElement || !currentInspection) {
      return undefined;
    }

    const property = getSelectedColorProperty();
    const variable = currentInspection.properties[property].detectedVariable;
    const useVariable = editVariableToggle.checked && variable;
    const target = useVariable
      ? variable.scopeElement ?? selectedElement
      : selectedElement;
    const mutationProperty = useVariable ? variable.name : property;

    return mutations
      .getRecords()
      .find(
        (record) =>
          record.element === target && record.property === mutationProperty
      );
  }

  function getCurrentDeclarationChange(): CssDeclarationChange | undefined {
    const record = getCurrentMutationRecord();
    return record ? createDeclarationChange(record) : undefined;
  }

  function getAllDeclarationChanges(): CssDeclarationChange[] {
    return mutations.getRecords().map(createDeclarationChange);
  }

  function createDeclarationChange(
    record: StyleMutationRecord
  ): CssDeclarationChange {
    return {
      selector: getSelectorForMutationTarget(record.element),
      property: record.property,
      value: record.nextValue
    };
  }

  function getSelectorForMutationTarget(element: HTMLElement): string {
    if (element === document.documentElement) {
      return ":root";
    }

    if (element === document.body) {
      return "body";
    }

    return generateSelector(element);
  }

  function rememberRecentColor(value: string) {
    const color = rgbToHex(value) ?? value;
    recentColors = [
      color,
      ...recentColors.filter(
        (existingColor) =>
          existingColor.toLowerCase() !== color.toLowerCase()
      )
    ].slice(0, recentSwatches.length);
  }

  function renderRecentColors() {
    for (const [index, swatch] of recentSwatches.entries()) {
      const color = recentColors[index];
      swatch.hidden = !color;
      swatch.dataset.colorValue = color ?? "";

      if (color) {
        setSwatch(swatch, color, `Recent ${color}`, color);
      }
    }
  }

  function loadSession(): PersistedColorPickerSession {
    try {
      return loadColorPickerSession(localStorage, window.location);
    } catch {
      return {
        version: 1,
        recentColors: [],
        changes: []
      };
    }
  }

  function restorePersistedSession() {
    persistedSession = loadSession();
    recentColors = persistedSession.recentColors.slice(0, recentSwatches.length);

    let restoredCount = 0;
    for (const change of persistedSession.changes) {
      const element = getElementForPersistedChange(change);
      if (!element || !isPersistableProperty(change.property)) {
        continue;
      }

      mutations.apply(element, change.property, change.value);
      restoredCount += 1;
    }

    refreshInspection();
    renderInspectedProperty();
    if (restoredCount > 0) {
      statusMessage.textContent = "Saved preview changes restored.";
    }
  }

  function getElementForPersistedChange(
    change: PersistedStyleChange
  ): HTMLElement | null {
    try {
      const element = document.querySelector(change.selector);
      return element instanceof HTMLElement ? element : null;
    } catch {
      return null;
    }
  }

  function isPersistableProperty(
    property: string
  ): property is ColorProperty | `--${string}` {
    return (
      property === "color" ||
      property === "background-color" ||
      property === "border-color" ||
      property.startsWith("--")
    );
  }

  function persistSession() {
    persistedSession = {
      version: 1,
      recentColors,
      changes: mutations.getRecords().map((record) => ({
        selector: getSelectorForMutationTarget(record.element),
        property: record.property,
        value: record.nextValue
      }))
    };

    try {
      saveColorPickerSession(localStorage, window.location, persistedSession);
    } catch {
      statusMessage.textContent = "Unable to save this preview session.";
    }
  }

  function clearPersistedSession() {
    try {
      clearColorPickerSession(localStorage, window.location);
    } catch {
      statusMessage.textContent = "Unable to clear saved session.";
    }
  }

  function hasPersistedSession() {
    return (
      persistedSession.recentColors.length > 0 ||
      persistedSession.changes.length > 0
    );
  }

  async function copyText(value: string, successMessage: string) {
    if (!value.trim()) {
      statusMessage.textContent = "No preview changes to copy.";
      return;
    }

    try {
      await writeClipboardText(value);
      statusMessage.textContent = successMessage;
    } catch {
      statusMessage.textContent = "Clipboard copy failed.";
    }
  }

  async function writeClipboardText(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "true");
    Object.assign(textArea.style, {
      position: "fixed",
      left: "-9999px",
      top: "0"
    });
    document.body.append(textArea);
    textArea.select();

    try {
      if (!document.execCommand("copy")) {
        throw new Error("execCommand copy returned false.");
      }
    } finally {
      textArea.remove();
    }
  }

  function getPreviewColorValue(): string | undefined {
    const rawValue = hexInput.value.trim();
    if (!rawValue) {
      return undefined;
    }

    if (opacityInput.value !== "100" && /^#[0-9a-f]{6}$/i.test(rawValue)) {
      return hexToRgb(rawValue, Number(opacityInput.value) / 100);
    }

    if (
      /^#[0-9a-f]{3,8}$/i.test(rawValue) ||
      /^rgba?\(/i.test(rawValue) ||
      /^hsla?\(/i.test(rawValue)
    ) {
      return rawValue;
    }

    return undefined;
  }

  return {
    destroy: () => {
      mutations.resetAll();
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

function hexToRgb(value: string, alpha: number): string {
  const normalized = value.replace("#", "");
  const channels = normalized.match(/.{2}/g);
  if (!channels) {
    return value;
  }

  const [red, green, blue] = channels.map((channel) => parseInt(channel, 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(2)})`;
}

function preserveOriginalValues(
  nextInspection: StyleInspection,
  previousInspection: StyleInspection | null
): StyleInspection {
  if (!previousInspection) {
    return nextInspection;
  }

  for (const property of Object.keys(nextInspection.properties) as ColorProperty[]) {
    nextInspection.properties[property].originalValue =
      previousInspection.properties[property].originalValue;
  }

  return nextInspection;
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
