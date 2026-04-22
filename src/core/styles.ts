import type { ColorProperty } from "../types.js";

export interface InspectedColorProperty {
  property: ColorProperty;
  computedValue: string;
  originalValue: string;
  displayValue: string;
  transparent: boolean;
  detectedVariable?: DetectedCssVariable;
}

export interface DetectedCssVariable {
  name: string;
  declarationValue: string;
  resolvedValue: string;
  scope?: string;
}

export interface StyleInspection {
  properties: Record<ColorProperty, InspectedColorProperty>;
}

const inspectedProperties: readonly ColorProperty[] = [
  "color",
  "background-color",
  "border-color"
];

export function inspectElementColors(element: Element): StyleInspection {
  const computedStyle = getComputedStyle(element);
  const declarations = getMatchingColorDeclarations(element);

  const properties = Object.fromEntries(
    inspectedProperties.map((property) => {
      const computedValue = getComputedColorValue(computedStyle, property);
      const detectedVariable = detectCssVariableForProperty(
        element,
        property,
        declarations
      );

      return [
        property,
        {
          property,
          computedValue,
          originalValue: computedValue,
          displayValue: formatDisplayColorValue(computedValue),
          transparent: isTransparentColor(computedValue),
          detectedVariable
        }
      ];
    })
  ) as Record<ColorProperty, InspectedColorProperty>;

  return { properties };
}

export function getComputedColorValue(
  computedStyle: CSSStyleDeclaration,
  property: ColorProperty
): string {
  if (property === "border-color") {
    return (
      computedStyle.getPropertyValue("border-top-color") ||
      computedStyle.getPropertyValue("border-color") ||
      "transparent"
    ).trim();
  }

  return (computedStyle.getPropertyValue(property) || "transparent").trim();
}

export function formatDisplayColorValue(value: string): string {
  const normalized = value.trim();
  if (!normalized || isTransparentColor(normalized)) {
    return "transparent";
  }

  return normalized;
}

export function isTransparentColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "transparent") {
    return true;
  }

  const rgbMatch = normalized.match(/^rgba?\((.*)\)$/);
  if (!rgbMatch) {
    return false;
  }

  const parts = rgbMatch[1]
    .split(/[\s,\/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const alpha = parts[3]?.replace("%", "");

  return alpha !== undefined && Number(alpha) === 0;
}

export function extractCssVariableName(value: string): string | undefined {
  return value.match(/var\(\s*(--[A-Za-z0-9_-]+)/)?.[1];
}

function detectCssVariableForProperty(
  element: Element,
  property: ColorProperty,
  declarations: readonly MatchedColorDeclaration[]
): DetectedCssVariable | undefined {
  const declaration = findLatestVariableDeclaration(element, property, declarations);
  if (!declaration) {
    return undefined;
  }

  const name = extractCssVariableName(declaration.value);
  if (!name) {
    return undefined;
  }

  return {
    name,
    declarationValue: declaration.value,
    resolvedValue: getComputedStyle(element).getPropertyValue(name).trim(),
    scope: findVariableScope(element, name)
  };
}

interface MatchedColorDeclaration {
  property: ColorProperty;
  value: string;
}

function findLatestVariableDeclaration(
  element: Element,
  property: ColorProperty,
  declarations: readonly MatchedColorDeclaration[]
): MatchedColorDeclaration | undefined {
  const inlineValue = element instanceof HTMLElement
    ? element.style.getPropertyValue(property)
    : "";
  if (extractCssVariableName(inlineValue)) {
    return { property, value: inlineValue.trim() };
  }

  for (const declaration of declarations.slice().reverse()) {
    if (declaration.property === property && extractCssVariableName(declaration.value)) {
      return declaration;
    }
  }

  return undefined;
}

function getMatchingColorDeclarations(
  element: Element
): MatchedColorDeclaration[] {
  const declarations: MatchedColorDeclaration[] = [];

  for (const sheet of Array.from(element.ownerDocument.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }

    collectMatchingDeclarations(element, rules, declarations);
  }

  return declarations;
}

function collectMatchingDeclarations(
  element: Element,
  rules: CSSRuleList,
  declarations: MatchedColorDeclaration[]
) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (!matchesSelectorList(element, rule.selectorText)) {
        continue;
      }

      for (const property of inspectedProperties) {
        const value = getRuleColorDeclaration(rule.style, property);
        if (value) {
          declarations.push({ property, value });
        }
      }
      continue;
    }

    if ("cssRules" in rule) {
      collectMatchingDeclarations(
        element,
        (rule as CSSGroupingRule).cssRules,
        declarations
      );
    }
  }
}

function getRuleColorDeclaration(
  style: CSSStyleDeclaration,
  property: ColorProperty
): string {
  if (property === "background-color") {
    return (
      style.getPropertyValue("background-color") ||
      style.getPropertyValue("background")
    ).trim();
  }

  if (property === "border-color") {
    return (
      style.getPropertyValue("border-color") ||
      style.getPropertyValue("border-top-color") ||
      style.getPropertyValue("border-right-color") ||
      style.getPropertyValue("border-bottom-color") ||
      style.getPropertyValue("border-left-color") ||
      style.getPropertyValue("border")
    ).trim();
  }

  return style.getPropertyValue(property).trim();
}

function matchesSelectorList(element: Element, selectorText: string): boolean {
  return selectorText
    .split(",")
    .map((selector) => selector.trim())
    .filter(Boolean)
    .some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
}

function findVariableScope(element: Element, variableName: string): string | undefined {
  const scope = findInlineVariableScope(element, variableName);
  if (scope) {
    return scope;
  }

  for (const sheet of Array.from(element.ownerDocument.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }

    const ruleScope = findVariableScopeInRules(element, variableName, rules);
    if (ruleScope) {
      return ruleScope;
    }
  }

  return undefined;
}

function findInlineVariableScope(
  element: Element,
  variableName: string
): string | undefined {
  let current: Element | null = element;
  while (current) {
    if (
      current instanceof HTMLElement &&
      current.style.getPropertyValue(variableName)
    ) {
      return current === element
        ? "selected element inline style"
        : `${current.tagName.toLowerCase()} inline style`;
    }

    current = current.parentElement;
  }

  return undefined;
}

function findVariableScopeInRules(
  element: Element,
  variableName: string,
  rules: CSSRuleList
): string | undefined {
  for (const rule of Array.from(rules).reverse()) {
    if (rule instanceof CSSStyleRule) {
      if (!rule.style.getPropertyValue(variableName)) {
        continue;
      }

      const selector = rule.selectorText;
      if (selector.includes(":root")) {
        return ":root";
      }

      if (selector === "html" || selector === "body") {
        return selector;
      }

      try {
        if (element.closest(selector)) {
          return selector;
        }
      } catch {
        continue;
      }
      continue;
    }

    if ("cssRules" in rule) {
      const scope = findVariableScopeInRules(
        element,
        variableName,
        (rule as CSSGroupingRule).cssRules
      );
      if (scope) {
        return scope;
      }
    }
  }

  return undefined;
}
