import {
  getSettings,
  type HotkeyCombo,
  subscribeToSettings,
} from "../../shared/settings-logic";
import { isPanelVisible, togglePanel } from "./panel-controller";

// ============================================================================
// Module State
// ============================================================================

/** The list of currently active hotkey combinations. */
let activeHotkeys: HotkeyCombo[] = [];

// ============================================================================
// Hotkey Logic
// ============================================================================

/**
 * Initializes the hotkey controller by loading settings and subscribing to changes.
 */
export async function initializeHotkeyController(): Promise<void> {
  try {
    const settings = await getSettings();
    activeHotkeys = settings.hotkeys;

    subscribeToSettings((newSettings) => {
      activeHotkeys = newSettings.hotkeys;
    });
  } catch (error) {
    console.warn("[ChineseFind] Failed to load hotkey settings.", error);
  }
}

/**
 * Checks if a keyboard event matches any of the configured hotkeys.
 * Ignores key presses inside input fields, unless it's our own search panel.
 */
function matchesConfiguredHotkey(event: KeyboardEvent): boolean {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  const target = event.target as HTMLElement;
  const isInEditableField =
    target.isContentEditable ||
    (target.tagName === "INPUT" &&
      !["button", "submit", "reset"].includes(
        (target as HTMLInputElement).type,
      )) ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT";

  if (isInEditableField && !target.closest("#chinese-find-root")) {
    return false;
  }

  return activeHotkeys.some(
    (combo) =>
      combo.key === key &&
      !!combo.ctrlKey === event.ctrlKey &&
      !!combo.metaKey === event.metaKey &&
      !!combo.altKey === event.altKey &&
      !!combo.shiftKey === event.shiftKey,
  );
}

// ============================================================================
// Event Binding
// ============================================================================

/**
 * Binds the global keydown listener to handle hotkeys.
 */
export function bindHotkeys(): void {
  window.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      if (matchesConfiguredHotkey(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        togglePanel(!isPanelVisible());
      } else if (event.key === "Escape" && isPanelVisible()) {
        togglePanel(false);
      }
    },
    true, // Use capture phase to handle event before the page does.
  );
}
