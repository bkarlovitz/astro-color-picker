import type { ColorProperty } from "../types.js";

export interface CssDeclarationChange {
  selector: string;
  property: ColorProperty;
  value: string;
}

export function formatCssDeclaration(change: CssDeclarationChange): string {
  return `${change.selector} {\n  ${change.property}: ${change.value};\n}`;
}
