export interface SelectedElementSummary {
  selector: string;
  tagName: string;
  id?: string;
  classNames: string[];
  width: number;
  height: number;
}

export interface ElementPicker {
  start: () => void;
  stop: () => void;
  select: (element: Element) => SelectedElementSummary;
  clear: () => void;
  destroy: () => void;
  getSelectedElement: () => Element | null;
}

export interface ElementPickerOptions {
  ignoredSelectors?: readonly string[];
  onHover?: (summary: SelectedElementSummary | null) => void;
  onSelect?: (summary: SelectedElementSummary, element: Element) => void;
  onCancel?: () => void;
  onSelectionLost?: () => void;
}

const internalSelector = [
  "astro-dev-toolbar",
  "astro-dev-toolbar-window",
  "astro-dev-toolbar-app-canvas",
  "[data-color-picker-widget]"
].join(",");

const ignoredTags = new Set([
  "html",
  "head",
  "body",
  "script",
  "style",
  "link",
  "meta",
  "title",
  "template"
]);

export function createElementPicker(
  options: ElementPickerOptions = {}
): ElementPicker {
  let active = false;
  let hoveredElement: Element | null = null;
  let selectedElement: Element | null = null;
  let hoverOverlay: HTMLElement | null = null;
  let selectedOverlay: HTMLElement | null = null;
  let tooltip: HTMLElement | null = null;

  document.addEventListener("astro:after-swap", updateOverlayPositions);
  document.addEventListener("astro:page-load", updateOverlayPositions);
  window.addEventListener("scroll", updateOverlayPositions, true);
  window.addEventListener("resize", updateOverlayPositions);

  function start() {
    if (active) {
      return;
    }

    active = true;
    ensureOverlays();
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
  }

  function stop() {
    if (!active) {
      return;
    }

    active = false;
    hoveredElement = null;
    hideHoverOverlay();
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    options.onHover?.(null);
  }

  function select(element: Element) {
    selectedElement = element;
    ensureSelectedOverlay();
    positionOverlay(selectedOverlay, element);
    const summary = summarizeSelectedElement(element);
    options.onSelect?.(summary, element);
    return summary;
  }

  function clear() {
    selectedElement = null;
    selectedOverlay?.remove();
    selectedOverlay = null;
    stop();
  }

  function destroy() {
    stop();
    selectedElement = null;
    hoverOverlay?.remove();
    selectedOverlay?.remove();
    tooltip?.remove();
    document.removeEventListener("astro:after-swap", updateOverlayPositions);
    document.removeEventListener("astro:page-load", updateOverlayPositions);
    window.removeEventListener("scroll", updateOverlayPositions, true);
    window.removeEventListener("resize", updateOverlayPositions);
    hoverOverlay = null;
    selectedOverlay = null;
    tooltip = null;
  }

  function handlePointerMove(event: PointerEvent) {
    const element = getPickableElementFromEvent(event, options.ignoredSelectors);
    if (element === hoveredElement) {
      return;
    }

    hoveredElement = element;
    if (!element) {
      hideHoverOverlay();
      options.onHover?.(null);
      return;
    }

    ensureOverlays();
    positionOverlay(hoverOverlay, element);
    updateTooltip(element);
    options.onHover?.(summarizeSelectedElement(element));
  }

  function handleClick(event: MouseEvent) {
    if (!active) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const element = getPickableElementFromEvent(event, options.ignoredSelectors);
    if (!element) {
      return;
    }

    select(element);
    stop();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    stop();
    options.onCancel?.();
  }

  function updateOverlayPositions() {
    if (hoveredElement) {
      positionOverlay(hoverOverlay, hoveredElement);
      updateTooltip(hoveredElement);
    }

    if (selectedElement) {
      if (document.documentElement.contains(selectedElement)) {
        positionOverlay(selectedOverlay, selectedElement);
      } else {
        selectedElement = null;
        selectedOverlay?.remove();
        selectedOverlay = null;
        options.onSelectionLost?.();
      }
    }
  }

  function ensureOverlays() {
    if (!hoverOverlay) {
      hoverOverlay = createOverlay("hover");
      document.documentElement.append(hoverOverlay);
    }

    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.dataset.colorPickerWidget = "tooltip";
      tooltip.textContent = "";
      Object.assign(tooltip.style, {
        position: "fixed",
        zIndex: "2147483647",
        pointerEvents: "none",
        border: "1px solid #0d9488",
        borderRadius: "6px",
        padding: "4px 7px",
        color: "#fafafa",
        background: "#18181b",
        font: "12px/1.3 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)"
      });
      document.documentElement.append(tooltip);
    }
  }

  function ensureSelectedOverlay() {
    if (!selectedOverlay) {
      selectedOverlay = createOverlay("selected");
      document.documentElement.append(selectedOverlay);
    }
  }

  function hideHoverOverlay() {
    if (hoverOverlay) {
      hoverOverlay.style.display = "none";
    }
    if (tooltip) {
      tooltip.style.display = "none";
    }
  }

  function updateTooltip(element: Element) {
    if (!tooltip) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const summary = summarizeSelectedElement(element);
    tooltip.textContent = formatElementLabel(summary);
    tooltip.style.display = rect.width > 0 && rect.height > 0 ? "block" : "none";
    tooltip.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 220))}px`;
    tooltip.style.top = `${Math.max(8, rect.top - 30)}px`;
  }

  return {
    start,
    stop,
    select,
    clear,
    destroy,
    getSelectedElement: () => selectedElement
  };
}

export function getPickableElementFromEvent(
  event: Event,
  ignoredSelectors: readonly string[] = []
): Element | null {
  const path = event.composedPath();

  if (
    path.some(
      (target) =>
        target instanceof Element &&
        (target.matches(internalSelector) || Boolean(target.closest(internalSelector)))
    )
  ) {
    return null;
  }

  for (const target of path) {
    if (!(target instanceof Element)) {
      continue;
    }

    if (isPickableElement(target, ignoredSelectors)) {
      return target;
    }
  }

  return null;
}

export function isPickableElement(
  element: Element,
  ignoredSelectors: readonly string[] = []
): boolean {
  const tagName = element.tagName.toLowerCase();
  if (ignoredTags.has(tagName)) {
    return false;
  }

  if (element.matches(internalSelector) || element.closest(internalSelector)) {
    return false;
  }

  return !ignoredSelectors.some((selector) => element.matches(selector));
}

export function summarizeSelectedElement(
  element: Element
): SelectedElementSummary {
  const rect = element.getBoundingClientRect();

  return {
    selector: generateSelector(element),
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    classNames: Array.from(element.classList),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

export function formatElementLabel(summary: SelectedElementSummary): string {
  const classSuffix =
    summary.classNames.length > 0
      ? `.${summary.classNames.slice(0, 2).join(".")}`
      : "";
  const idSuffix = summary.id ? `#${summary.id}` : "";

  return `${summary.tagName}${idSuffix}${classSuffix} ${summary.width}x${summary.height}`;
}

export function generateSelector(element: Element): string {
  const documentRoot = element.ownerDocument;

  if (element.id) {
    const selector = `#${escapeCssIdentifier(element.id)}`;
    if (documentRoot.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  const classNames = Array.from(element.classList).filter(Boolean);
  for (let count = 1; count <= Math.min(3, classNames.length); count += 1) {
    const selector = `${element.tagName.toLowerCase()}${classNames
      .slice(0, count)
      .map((className) => `.${escapeCssIdentifier(className)}`)
      .join("")}`;

    if (documentRoot.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  return getElementPath(element);
}

function getElementPath(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.ownerDocument.documentElement !== current) {
    if (!current.parentElement) {
      break;
    }

    const tagName = current.tagName.toLowerCase();
    const sameTagSiblings = Array.from(current.parentElement.children).filter(
      (sibling) => sibling.tagName.toLowerCase() === tagName
    );
    const segment =
      sameTagSiblings.length > 1
        ? `${tagName}:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`
        : tagName;

    path.unshift(segment);

    const selector = path.join(" > ");
    if (current.ownerDocument.querySelectorAll(selector).length === 1) {
      return selector;
    }

    current = current.parentElement;
  }

  return path.join(" > ") || element.tagName.toLowerCase();
}

function createOverlay(kind: "hover" | "selected"): HTMLElement {
  const overlay = document.createElement("div");
  overlay.dataset.colorPickerWidget = `${kind}-overlay`;
  Object.assign(overlay.style, {
    position: "fixed",
    display: "none",
    zIndex: "2147483646",
    pointerEvents: "none",
    border:
      kind === "hover" ? "2px solid #22d3ee" : "2px solid #f59e0b",
    borderRadius: "4px",
    background:
      kind === "hover" ? "rgba(34, 211, 238, 0.12)" : "rgba(245, 158, 11, 0.12)",
    boxShadow:
      kind === "hover"
        ? "0 0 0 1px rgba(8, 145, 178, 0.45)"
        : "0 0 0 1px rgba(217, 119, 6, 0.45)"
  });

  return overlay;
}

function positionOverlay(overlay: HTMLElement | null, element: Element) {
  if (!overlay) {
    return;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "block";
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

function escapeCssIdentifier(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
