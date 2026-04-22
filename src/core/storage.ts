export function getStorageKey(origin: string, pathname: string): string {
  return `astro-color-picker-widget:${origin}:${pathname}`;
}

export interface PersistedStyleChange {
  selector: string;
  property: string;
  value: string;
}

export interface PersistedColorPickerSession {
  version: 1;
  recentColors: string[];
  changes: PersistedStyleChange[];
}

export function createEmptySession(): PersistedColorPickerSession {
  return {
    version: 1,
    recentColors: [],
    changes: []
  };
}

export function getCurrentStorageKey(location: Location): string {
  return getStorageKey(location.origin, location.pathname);
}

export function loadColorPickerSession(
  storage: Storage,
  location: Location
): PersistedColorPickerSession {
  const rawValue = storage.getItem(getCurrentStorageKey(location));
  if (!rawValue) {
    return createEmptySession();
  }

  try {
    return normalizeSession(JSON.parse(rawValue));
  } catch {
    return createEmptySession();
  }
}

export function saveColorPickerSession(
  storage: Storage,
  location: Location,
  session: PersistedColorPickerSession
): void {
  storage.setItem(
    getCurrentStorageKey(location),
    JSON.stringify(normalizeSession(session))
  );
}

export function clearColorPickerSession(
  storage: Storage,
  location: Location
): void {
  storage.removeItem(getCurrentStorageKey(location));
}

function normalizeSession(value: unknown): PersistedColorPickerSession {
  if (!value || typeof value !== "object") {
    return createEmptySession();
  }

  const record = value as Partial<PersistedColorPickerSession>;
  return {
    version: 1,
    recentColors: normalizeRecentColors(record.recentColors),
    changes: normalizeChanges(record.changes)
  };
}

function normalizeRecentColors(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((color): color is string => typeof color === "string")
    .filter((color) => color.length > 0)
    .slice(0, 8);
}

function normalizeChanges(value: unknown): PersistedStyleChange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((change) => {
    if (!change || typeof change !== "object") {
      return [];
    }

    const record = change as Partial<PersistedStyleChange>;
    if (
      typeof record.selector !== "string" ||
      typeof record.property !== "string" ||
      typeof record.value !== "string" ||
      !record.selector ||
      !record.property
    ) {
      return [];
    }

    return [
      {
        selector: record.selector,
        property: record.property,
        value: record.value
      }
    ];
  });
}
