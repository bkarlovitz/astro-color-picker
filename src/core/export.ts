import type { ColorProperty } from "../types.js";

export interface CssDeclarationChange {
  selector: string;
  property: ColorProperty | `--${string}`;
  value: string;
}

export function formatCssDeclaration(change: CssDeclarationChange): string {
  return `${change.selector} {\n  ${change.property}: ${change.value};\n}`;
}

export function formatCssDeclarations(
  changes: readonly CssDeclarationChange[]
): string {
  const groups = new Map<string, Map<string, string>>();

  for (const change of changes) {
    const declarations = groups.get(change.selector) ?? new Map<string, string>();
    declarations.set(change.property, change.value);
    groups.set(change.selector, declarations);
  }

  return Array.from(groups.entries())
    .map(([selector, declarations]) => {
      const body = Array.from(declarations.entries())
        .map(([property, value]) => `  ${property}: ${value};`)
        .join("\n");

      return `${selector} {\n${body}\n}`;
    })
    .join("\n\n");
}

export function formatCssVariableAssignment(change: CssDeclarationChange): string {
  if (!change.property.startsWith("--")) {
    return formatCssDeclaration(change);
  }

  return `${change.selector} {\n  ${change.property}: ${change.value};\n}`;
}
