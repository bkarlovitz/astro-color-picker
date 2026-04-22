export type ColorProperty = "color" | "background-color" | "border-color";

export type CopyFormat = "hex" | "rgb" | "hsl" | "preserve";

export interface ColorPickerWidgetOptions {
  enabled?: boolean;
  defaultProperty?: ColorProperty;
  storage?: boolean;
  ignoredSelectors?: string[];
  rootVariableScopes?: string[];
  copyFormat?: CopyFormat;
}

export const supportedColorProperties: readonly ColorProperty[] = [
  "color",
  "background-color",
  "border-color"
];
