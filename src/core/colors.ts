export interface ParsedColor {
  format: "hex" | "rgb" | "hsl";
  value: string;
}

export function isSupportedColorInput(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    /^#[0-9a-f]{3,8}$/.test(normalized) ||
    /^rgba?\(/.test(normalized) ||
    /^hsla?\(/.test(normalized)
  );
}

export function getUnsupportedColorMessage(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return "Enter a color before previewing.";
  }

  if (normalized.startsWith("#")) {
    return "HEX colors must use 3, 4, 6, or 8 hexadecimal digits.";
  }

  if (/^[a-z]+$/i.test(normalized)) {
    return "Named colors are not editable yet. Use HEX, RGB(A), or HSL(A).";
  }

  if (/^[a-z-]+\(/i.test(normalized)) {
    return "That color function is not supported yet. Use HEX, RGB(A), or HSL(A).";
  }

  return "Use a supported color format: HEX, RGB(A), or HSL(A).";
}
