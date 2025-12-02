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
  document.body.appendChild(highlightContainer);
  return highlightContainer;
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
 * Creates a visual highlight element for a single Range.
 */
function highlightRange(
  range: Range,
  isCurrent: boolean,
  container: HTMLElement,
): void {
  try {
    for (const rect of range.getClientRects()) {
      if (rect.width < 1 || rect.height < 1) continue;

      const div = document.createElement("div");
      div.className = `chinese-find-highlight${isCurrent ? " current" : ""}`;
      div.style.cssText = `
        position: absolute;
        top: ${rect.top + window.scrollY}px;
        left: ${rect.left + window.scrollX}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
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
