import type { ColorProperty } from "../types.js";

export interface StyleMutationRecord {
  element: HTMLElement;
  property: ColorProperty | `--${string}`;
  previousValue: string;
  nextValue: string;
}

export interface StyleMutationManager {
  apply: (
    element: Element,
    property: ColorProperty | `--${string}`,
    value: string
  ) => StyleMutationRecord | undefined;
  reset: (
    element: Element,
    property: ColorProperty | `--${string}`
  ) => boolean;
  resetAll: () => void;
  hasMutation: (
    element?: Element | null,
    property?: ColorProperty | `--${string}`
  ) => boolean;
  getRecords: () => StyleMutationRecord[];
}

export function createStyleMutationManager(): StyleMutationManager {
  const records = new Map<string, StyleMutationRecord>();

  function apply(
    element: Element,
    property: ColorProperty | `--${string}`,
    value: string
  ) {
    if (!(element instanceof HTMLElement)) {
      return undefined;
    }

    const key = getRecordKey(element, property);
    const currentRecord = records.get(key);
    const previousValue =
      currentRecord?.previousValue ?? element.style.getPropertyValue(property);

    element.style.setProperty(property, value);

    const record: StyleMutationRecord = {
      element,
      property,
      previousValue,
      nextValue: value
    };
    records.set(key, record);
    return record;
  }

  function reset(element: Element, property: ColorProperty | `--${string}`) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const key = getRecordKey(element, property);
    const record = records.get(key);
    if (!record) {
      return false;
    }

    restoreRecord(record);
    records.delete(key);
    return true;
  }

  function resetAll() {
    for (const record of Array.from(records.values()).reverse()) {
      restoreRecord(record);
    }
    records.clear();
  }

  function hasMutation(
    element?: Element | null,
    property?: ColorProperty | `--${string}`
  ) {
    if (!element && !property) {
      return records.size > 0;
    }

    for (const record of records.values()) {
      if (element && record.element !== element) {
        continue;
      }

      if (property && record.property !== property) {
        continue;
      }

      return true;
    }

    return false;
  }

  return {
    apply,
    reset,
    resetAll,
    hasMutation,
    getRecords: () => Array.from(records.values())
  };
}

function restoreRecord(record: StyleMutationRecord) {
  if (record.previousValue) {
    record.element.style.setProperty(record.property, record.previousValue);
  } else {
    record.element.style.removeProperty(record.property);
  }
}

let elementId = 0;
const elementIds = new WeakMap<Element, number>();

function getRecordKey(
  element: Element,
  property: ColorProperty | `--${string}`
) {
  let id = elementIds.get(element);
  if (!id) {
    id = (elementId += 1);
    elementIds.set(element, id);
  }

  return `${id}:${property}`;
}
