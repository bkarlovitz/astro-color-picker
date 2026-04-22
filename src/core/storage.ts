export function getStorageKey(origin: string, pathname: string): string {
  return `astro-color-picker-widget:${origin}:${pathname}`;
}
