export type ColorPickerPropertyMode =
  | "color"
  | "background-color"
  | "border-color"
  | "css-variable";

type ToolbarWindowElement = HTMLElement & {
  placement?: "bottom-left" | "bottom-center" | "bottom-right";
};

const propertyModes: readonly {
  label: string;
  value: ColorPickerPropertyMode;
}[] = [
  { label: "Text", value: "color" },
  { label: "Background", value: "background-color" },
  { label: "Border", value: "border-color" },
  { label: "Variable", value: "css-variable" }
];

export function createButton(
  label: string,
  options: {
    action?: string;
    disabled?: boolean;
    icon?: string;
    variant?: "primary" | "secondary" | "ghost";
  } = {}
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `acp-button acp-button--${options.variant ?? "secondary"}`;
  if (options.action) {
    button.dataset.action = options.action;
  }
  button.disabled = options.disabled ?? false;

  if (options.icon) {
    const icon = document.createElement("span");
    icon.className = "acp-button__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = options.icon;
    button.append(icon);
  }

  const text = document.createElement("span");
  text.textContent = label;
  button.append(text);
  return button;
}

export function createColorPickerShell(): HTMLElement {
  const windowElement = document.createElement(
    "astro-dev-toolbar-window"
  ) as ToolbarWindowElement;
  windowElement.dataset.colorPickerWidget = "window";

  const style = document.createElement("style");
  style.textContent = colorPickerShellStyles;
  windowElement.append(style);

  const shell = document.createElement("div");
  shell.className = "acp-shell";

  shell.append(createHeader());
  shell.append(createTargetSection());
  shell.append(createPropertySection());
  shell.append(createEditorSection());
  shell.append(createTokenSection());
  shell.append(createRecentColorsSection());
  shell.append(createActionsSection());

  windowElement.append(shell);
  return windowElement;
}

function createHeader(): HTMLElement {
  const header = document.createElement("header");
  header.className = "acp-header";

  const title = document.createElement("h1");
  title.className = "acp-title";
  title.append(createInlineIcon(paletteIcon));

  const text = document.createElement("span");
  text.textContent = "Color Picker";
  title.append(text);

  const status = document.createElement("span");
  status.className = "acp-status";
  status.dataset.colorPickerWidget = "mode-status";
  status.textContent = "Ready";

  header.append(title, status);
  return header;
}

function createTargetSection(): HTMLElement {
  const section = createSection("Element Target");
  const row = document.createElement("div");
  row.className = "acp-row acp-row--split";

  row.append(
    createButton("Pick", {
      action: "pick-element",
      icon: crosshairIcon,
      variant: "primary"
    }),
    createButton("Clear", {
      action: "clear-selection",
      disabled: true,
      icon: xIcon,
      variant: "ghost"
    })
  );

  const selected = document.createElement("p");
  selected.className = "acp-empty";
  selected.dataset.colorPickerWidget = "selected-summary";
  selected.textContent = "No element selected";

  const selectorLabel = document.createElement("label");
  selectorLabel.className = "acp-field";

  const selectorText = document.createElement("span");
  selectorText.textContent = "Selector";

  const selectorInput = document.createElement("input");
  selectorInput.type = "text";
  selectorInput.name = "selector";
  selectorInput.placeholder = ".sample-card";
  selectorInput.autocomplete = "off";
  selectorInput.spellcheck = false;
  selectorInput.dataset.colorPickerWidget = "selector-input";

  selectorLabel.append(selectorText, selectorInput);
  section.append(row, selected, selectorLabel);
  return section;
}

function createPropertySection(): HTMLElement {
  const section = createSection("Property");
  const group = document.createElement("fieldset");
  group.className = "acp-segmented";

  const legend = document.createElement("legend");
  legend.textContent = "Property mode";
  group.append(legend);

  for (const mode of propertyModes) {
    const label = document.createElement("label");
    label.className = "acp-segment";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "property";
  input.value = mode.value;
  input.dataset.colorPickerWidget = "property-mode";
  input.checked = mode.value === "color";

    const text = document.createElement("span");
    text.textContent = mode.label;

    label.append(input, text);
    group.append(label);
  }

  section.append(group);
  return section;
}

function createEditorSection(): HTMLElement {
  const section = createSection("Color");
  const grid = document.createElement("div");
  grid.className = "acp-editor-grid";

  const colorLabel = document.createElement("label");
  colorLabel.className = "acp-field acp-field--compact";
  const colorText = document.createElement("span");
  colorText.textContent = "Color";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.name = "color";
  colorInput.value = "#2563eb";
  colorInput.dataset.colorPickerWidget = "color-input";
  colorLabel.append(colorText, colorInput);

  const hexLabel = document.createElement("label");
  hexLabel.className = "acp-field";
  const hexText = document.createElement("span");
  hexText.textContent = "HEX";
  const hexInput = document.createElement("input");
  hexInput.type = "text";
  hexInput.name = "hex";
  hexInput.value = "#2563eb";
  hexInput.inputMode = "text";
  hexInput.spellcheck = false;
  hexInput.dataset.colorPickerWidget = "hex-input";
  hexLabel.append(hexText, hexInput);

  grid.append(colorLabel, hexLabel);

  const readout = document.createElement("output");
  readout.className = "acp-readout";
  readout.htmlFor = "color";
  readout.dataset.colorPickerWidget = "color-readout";
  readout.textContent = "rgb(37 99 235)";

  const opacityLabel = document.createElement("label");
  opacityLabel.className = "acp-field";
  const opacityText = document.createElement("span");
  opacityText.textContent = "Opacity";
  const opacityInput = document.createElement("input");
  opacityInput.type = "range";
  opacityInput.name = "opacity";
  opacityInput.min = "0";
  opacityInput.max = "100";
  opacityInput.value = "100";
  opacityInput.dataset.colorPickerWidget = "opacity-input";
  opacityLabel.append(opacityText, opacityInput);

  section.append(grid, readout, opacityLabel);
  return section;
}

function createTokenSection(): HTMLElement {
  const section = createSection("Token");
  const token = document.createElement("p");
  token.className = "acp-empty";
  token.dataset.colorPickerWidget = "token-summary";
  token.textContent = "No variable detected";

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "acp-toggle";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = "edit-variable";
  input.dataset.colorPickerWidget = "edit-variable-toggle";
  input.disabled = true;

  const control = document.createElement("span");
  control.className = "acp-toggle__control";
  control.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = "Edit variable preview";

  toggleLabel.append(input, control, text);
  section.append(token, toggleLabel);
  return section;
}

function createRecentColorsSection(): HTMLElement {
  const section = createSection("Recent");
  const swatches = document.createElement("div");
  swatches.className = "acp-swatches";

  for (const [label, value, kind] of [
    ["Current", "#2563eb", "current-swatch"],
    ["Original", "#18181b", "original-swatch"],
    ["Recent", "#f59e0b", "recent-swatch"],
    ["Recent", "#0d9488", "recent-swatch"],
    ["Recent", "#18181b", "recent-swatch"],
    ["Recent", "#ffffff", "recent-swatch"]
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "acp-swatch";
    button.dataset.colorPickerWidget = kind;
    button.setAttribute("aria-label", `${label} color ${value}`);
    button.style.setProperty("--swatch", value);
    if (kind === "recent-swatch") {
      button.hidden = true;
    }

    const text = document.createElement("span");
    text.textContent = label;
    button.append(text);
    swatches.append(button);
  }

  section.append(swatches);
  return section;
}

function createActionsSection(): HTMLElement {
  const section = createSection("Actions");
  const row = document.createElement("div");
  row.className = "acp-actions";

  row.append(
    createButton("Reset", {
      action: "reset-property",
      disabled: true,
      icon: resetIcon
    }),
    createButton("Reset All", {
      action: "reset-all",
      disabled: true,
      icon: resetAllIcon
    }),
    createButton("Copy CSS", {
      action: "copy-css",
      disabled: true,
      icon: copyIcon
    }),
    createButton("Copy All", {
      action: "copy-all",
      disabled: true,
      icon: copyIcon
    }),
    createButton("Copy Token", {
      action: "copy-token",
      disabled: true,
      icon: copyIcon
    }),
    createButton("Clear Saved", {
      action: "clear-saved",
      disabled: true,
      icon: xIcon,
      variant: "ghost"
    })
  );

  const liveRegion = document.createElement("p");
  liveRegion.className = "acp-live";
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.dataset.colorPickerWidget = "status-message";

  section.append(row, liveRegion);
  return section;
}

function createSection(title: string): HTMLElement {
  const section = document.createElement("section");
  section.className = "acp-section";

  const heading = document.createElement("h2");
  heading.textContent = title;

  section.append(heading);
  return section;
}

function createInlineIcon(svg: string): HTMLElement {
  const icon = document.createElement("span");
  icon.className = "acp-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = svg;
  return icon;
}

const colorPickerShellStyles = `
  :host astro-dev-toolbar-window {
    width: min(360px, calc(100vw - 32px));
    max-height: min(640px, calc(100vh - 112px));
    overflow: auto;
    color-scheme: dark;
  }

  .acp-shell,
  .acp-shell * {
    box-sizing: border-box;
  }

  .acp-shell {
    display: grid;
    gap: 14px;
    min-width: 0;
    color: #fafafa;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      "Segoe UI", sans-serif;
    font-size: 13px;
    line-height: 1.4;
  }

  .acp-header,
  .acp-row,
  .acp-actions,
  .acp-swatches {
    display: flex;
    align-items: center;
  }

  .acp-header,
  .acp-row--split {
    justify-content: space-between;
    gap: 10px;
  }

  .acp-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
    color: #ffffff;
    font-size: 18px;
    font-weight: 650;
    letter-spacing: 0;
  }

  .acp-icon,
  .acp-button__icon {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .acp-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #0d9488;
  }

  .acp-icon svg {
    width: 16px;
    height: 16px;
  }

  .acp-button__icon svg {
    width: 14px;
    height: 14px;
  }

  .acp-status {
    flex: 0 0 auto;
    border: 1px solid #155e75;
    border-radius: 999px;
    padding: 3px 8px;
    color: #a7f3d0;
    background: #115e59;
    font-size: 12px;
    font-weight: 600;
  }

  .acp-section {
    display: grid;
    gap: 10px;
    min-width: 0;
    border-top: 1px solid #3f3f46;
    padding-top: 12px;
  }

  .acp-section h2 {
    margin: 0;
    color: #d4d4d8;
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .acp-empty {
    min-width: 0;
    margin: 0;
    border: 1px dashed #52525b;
    border-radius: 6px;
    padding: 8px 10px;
    color: #a1a1aa;
    background: #18181b;
    overflow-wrap: anywhere;
  }

  .acp-field {
    display: grid;
    gap: 5px;
    min-width: 0;
    color: #d4d4d8;
    font-size: 12px;
    font-weight: 600;
  }

  .acp-field--compact {
    align-content: end;
  }

  .acp-field input[type="text"],
  .acp-field input[type="color"] {
    width: 100%;
    min-width: 0;
    border: 1px solid #52525b;
    border-radius: 6px;
    color: #fafafa;
    background: #09090b;
  }

  .acp-field input[type="text"] {
    height: 34px;
    padding: 0 9px;
    font: inherit;
    font-size: 13px;
  }

  .acp-field input[type="color"] {
    height: 34px;
    padding: 3px;
  }

  .acp-field input[type="range"] {
    width: 100%;
    accent-color: #14b8a6;
  }

  .acp-field input:focus-visible,
  .acp-segment input:focus-visible + span,
  .acp-toggle input:focus-visible + .acp-toggle__control,
  .acp-button:focus-visible,
  .acp-swatch:focus-visible {
    outline: 2px solid #22d3ee;
    outline-offset: 2px;
  }

  .acp-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 32px;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 0 10px;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .acp-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .acp-button--primary {
    border-color: #0d9488;
    color: #ffffff;
    background: #0d9488;
  }

  .acp-button--secondary {
    border-color: #52525b;
    color: #e4e4e7;
    background: #27272a;
  }

  .acp-button--ghost {
    border-color: transparent;
    color: #d4d4d8;
    background: transparent;
  }

  .acp-button:not(:disabled):hover,
  .acp-swatch:not(:disabled):hover {
    filter: brightness(1.12);
  }

  .acp-segmented {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    min-width: 0;
    margin: 0;
    border: 0;
    padding: 0;
  }

  .acp-segmented legend {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .acp-segment {
    min-width: 0;
  }

  .acp-segment input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .acp-segment span {
    display: grid;
    place-items: center;
    min-height: 32px;
    border: 1px solid #52525b;
    border-radius: 6px;
    padding: 0 8px;
    color: #d4d4d8;
    background: #18181b;
    font-weight: 650;
    text-align: center;
  }

  .acp-segment input:checked + span {
    border-color: #0d9488;
    color: #ffffff;
    background: #115e59;
  }

  .acp-editor-grid {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 8px;
  }

  .acp-readout {
    min-width: 0;
    border-radius: 6px;
    padding: 7px 9px;
    color: #fde68a;
    background: #451a03;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .acp-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #d4d4d8;
    font-weight: 600;
  }

  .acp-toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .acp-toggle__control {
    display: inline-flex;
    width: 34px;
    height: 20px;
    border-radius: 999px;
    padding: 2px;
    background: #3f3f46;
  }

  .acp-toggle__control::before {
    content: "";
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #fafafa;
  }

  .acp-toggle input:checked + .acp-toggle__control {
    background: #0d9488;
  }

  .acp-toggle input:checked + .acp-toggle__control::before {
    transform: translateX(14px);
  }

  .acp-toggle input:disabled + .acp-toggle__control,
  .acp-toggle input:disabled ~ span {
    opacity: 0.5;
  }

  .acp-swatches {
    flex-wrap: wrap;
    gap: 8px;
  }

  .acp-swatch {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    border: 1px solid #52525b;
    border-radius: 6px;
    padding: 0 8px 0 6px;
    color: #e4e4e7;
    background: #18181b;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .acp-swatch::before {
    content: "";
    width: 16px;
    height: 16px;
    border: 1px solid #ffffff66;
    border-radius: 4px;
    background: var(--swatch);
  }

  .acp-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .acp-live {
    min-height: 1em;
    margin: 0;
    color: #a7f3d0;
  }
`;

const paletteIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M12 3a9 9 0 0 0 0 18h.6a2.2 2.2 0 0 0 1.5-3.82.75.75 0 0 1 .5-1.31h1.15A5.25 5.25 0 0 0 21 10.62C21 6.41 17 3 12 3Zm-4 8.25a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm3-3.75a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm4 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm3 3.75a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z"/></svg>';
const crosshairIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="M8 1.75v2M8 12.25v2M14.25 8h-2M3.75 8h-2"/><circle cx="8" cy="8" r="3.25" stroke="currentColor" stroke-width="1.5"/></svg>';
const xIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="m4.25 4.25 7.5 7.5m0-7.5-7.5 7.5"/></svg>';
const resetIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.25 5.75h-2v-2m.18 2A5.5 5.5 0 1 1 2.75 10"/></svg>';
const resetAllIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.5 6h-2V4m.2 2A5 5 0 0 1 10 3.2M12.5 10h2v2m-.2-2A5 5 0 0 1 6 12.8"/></svg>';
const copyIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" d="M5.25 5.25h7v7h-7z"/><path stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" d="M3.25 10.75H2.5a.75.75 0 0 1-.75-.75V2.5c0-.41.34-.75.75-.75H10c.41 0 .75.34.75.75v.75"/></svg>';
