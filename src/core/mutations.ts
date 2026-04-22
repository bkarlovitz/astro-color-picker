import type { ColorProperty } from "../types.js";

export interface StyleMutationRecord {
  element: Element;
  property: ColorProperty;
  previousValue: string;
  nextValue: string;
}
