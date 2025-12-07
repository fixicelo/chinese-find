import {
  colorSettingToRgba,
  type UserSettings,
} from "../../shared/settings-logic";

let refreshPending = false;

/**
 * Creates and appends the highlight container to the document body.
 * @returns The created container element.
 */
export function initHighlightContainer(): HTMLDivElement {
  const highlightContainer = document.createElement("div");
  highlightContainer.id = "chinese-find-highlight-container";
  return highlightContainer;
}

/**
 * Appends the highlight container to the document body if it's not already there.
 * @param container The highlight container element.
 */
export function mountHighlightContainer(container: HTMLElement): void {
  if (document.body && !document.body.contains(container)) {
    document.body.appendChild(container);
  }
}

/**
 * Applies highlight color settings to CSS variables.
 * @param settings The user settings for highlighting.
 */
export function applyHighlightSettings(settings: UserSettings): void {
  const root = document.documentElement;
  root.style.setProperty(
    "--chinese-find-match-bg",
    colorSettingToRgba(settings.matchHighlight),
  );
  root.style.setProperty(
    "--chinese-find-current-bg",
    colorSettingToRgba(settings.currentHighlight),
  );

  const outlineColor = settings.showOutline
    ? colorSettingToRgba(settings.currentOutline)
    : "transparent";
  root.style.setProperty("--chinese-find-current-outline", outlineColor);
}

/**
 * Calculates the visible part of a rect by checking ancestors for clipping.
 */
function getClippedRect(rect: DOMRect, containerNode: Node): DOMRect | null {
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;

  let el: HTMLElement | null =
    containerNode.nodeType === Node.ELEMENT_NODE
      ? (containerNode as HTMLElement)
      : containerNode.parentElement;

  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    if (
      style.overflow !== "visible" ||
      style.overflowX !== "visible" ||
      style.overflowY !== "visible"
    ) {
      const parentRect = el.getBoundingClientRect();
      const clipLeft = parentRect.left + el.clientLeft;
      const clipTop = parentRect.top + el.clientTop;
      const clipRight = clipLeft + el.clientWidth;
      const clipBottom = clipTop + el.clientHeight;

      left = Math.max(left, clipLeft);
      top = Math.max(top, clipTop);
      right = Math.min(right, clipRight);
      bottom = Math.min(bottom, clipBottom);

      if (left >= right || top >= bottom) {
        return null;
      }
    }
    el = el.parentElement;
  }

  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * Creates a visual highlight element for a single Range.
 */
function highlightRange(
  range: Range,
  isCurrent: boolean,
  container: HTMLElement,
): void {
  try {
    const commonAncestor = range.commonAncestorContainer;
    for (const rect of range.getClientRects()) {
      if (rect.width < 1 || rect.height < 1) continue;

      const clippedRect = getClippedRect(rect, commonAncestor);
      if (!clippedRect) continue;

      const div = document.createElement("div");
      div.className = `chinese-find-highlight${isCurrent ? " current" : ""}`;
      div.style.cssText = `
        position: absolute;
        top: ${clippedRect.top + window.scrollY}px;
        left: ${clippedRect.left + window.scrollX}px;
        width: ${clippedRect.width}px;
        height: ${clippedRect.height}px;
        z-index: 99998;
        pointer-events: none;
      `;
      container.appendChild(div);
    }
  } catch {
    // Range might have become invalid due to DOM changes
  }
}

/**
 * Clears all visual highlights from the container.
 * @param container The container element holding the highlights.
 * @param resetState A callback to reset the main panel's state (matches and currentIndex).
 */
export function clearAllHighlights(
  container: HTMLElement,
  resetState: () => void,
): void {
  if (container) {
    container.innerHTML = "";
  }
  resetState();
}

/**
 * Renders all highlights for the given matches. This is the direct, un-throttled render function.
 */
function directRender(
  container: HTMLElement,
  matches: Range[],
  currentIndex: number,
): void {
  if (!container) return;
  container.innerHTML = "";
  matches.forEach((range, i) => {
    highlightRange(range, i === currentIndex, container);
  });
}

/**
 * Schedules a highlight refresh using requestAnimationFrame to throttle rendering.
 */
export function renderHighlights(
  container: HTMLElement,
  matches: Range[],
  currentIndex: number,
): void {
  if (refreshPending || !container) return;
  if (matches.length === 0) {
    if (container.innerHTML !== "") container.innerHTML = "";
    return;
  }

  refreshPending = true;
  requestAnimationFrame(() => {
    refreshPending = false;
    directRender(container, matches, currentIndex);
  });
}
