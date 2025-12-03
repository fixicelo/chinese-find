import panelHtml from "./search-panel.html?raw";

/**
 * Mounts the search panel UI into the page.
 * @returns The root element of the mounted panel.
 */
export function mountPanel(): HTMLDivElement {
  const root = document.createElement("div");
  root.id = "chinese-find-root";
  root.innerHTML = panelHtml;
  document.documentElement.appendChild(root);

  const panel = getPanel();
  if (panel) {
    initDraggablePanel(panel);
  }

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

function initDraggablePanel(panel: HTMLElement) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  panel.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    // Only allow dragging when clicking on the panel itself or the header,
    // but not on buttons, inputs, or other interactive elements.
    if (
      target.closest(
        "button, input, .chinese-find-panel__body, .chinese-find-panel__footer",
      )
    ) {
      return;
    }

    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
    panel.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;

    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      panel.style.cursor = "grab";
    }
  });

  panel.style.cursor = "grab";
}
