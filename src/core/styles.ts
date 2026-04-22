import type { ColorProperty } from "../types.js";

export interface InspectedColorProperty {
  property: ColorProperty;
  computedValue: string;
  detectedVariableName?: string;
}
