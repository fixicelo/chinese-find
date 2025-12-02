import panelHtml from "./search-panel.html?raw";

/**
 * Mounts the search panel UI into the page.
 * @returns The root element of the mounted panel.
 */
export function mountPanel(): HTMLDivElement {
  const root = document.createElement("div");
  root.id = "chinese-find-root";
  root.innerHTML = panelHtml;
  document.body.appendChild(root);
  togglePanel(false); // Initially hidden
  return root;
}

/**
 * Gets the main panel element from the DOM.
 * @returns The panel element or null if not found.
 */
function getPanel(): HTMLElement | null {
  return document.getElementById("chinese-find-panel");
}

/**
 * Toggles the visibility of the search panel.
 * @param show - Whether to show or hide the panel.
 */
export function togglePanel(show: boolean): void {
  const panel = getPanel();
  if (!panel) return;

  panel.style.display = show ? "block" : "none";
  window.dispatchEvent(
    new CustomEvent("chineseFind:panelToggle", { detail: { show } }),
  );

  if (show) {
    panel.querySelector<HTMLInputElement>("#chinese-find-input")?.focus();
  }
}

/**
 * Checks if the search panel is currently visible.
 * @returns True if the panel is visible, false otherwise.
 */
export function isPanelVisible(): boolean {
  return getPanel()?.style.display !== "none";
}
