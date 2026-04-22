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
