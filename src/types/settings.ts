/**
 * @fileoverview Type definitions for the Chinese Find extension settings.
 *
 * This file contains pure type definitions and no logic or default values.
 * Default values and helper functions can be found in `shared/settings-logic.ts`.
 */

// ============================================================================
// Hotkey Related Types
// ============================================================================

/**
 * Hotkey combination settings.
 *
 * @example
 * // Ctrl+F
 * { key: 'f', ctrlKey: true }
 *
 * @example
 * // Cmd+Shift+F (Mac)
 * { key: 'f', metaKey: true, shiftKey: true }
 */
export type HotkeyCombo = {
  /** The primary key (lowercase letter or special key like 'ArrowUp'). */
  key: string;
  /** Whether the Ctrl key needs to be pressed. */
  ctrlKey?: boolean;
  /** Whether the Meta key needs to be pressed (Mac: ⌘, Windows: Win). */
  metaKey?: boolean;
  /** Whether the Alt key needs to be pressed (Mac: ⌥). */
  altKey?: boolean;
  /** Whether the Shift key needs to be pressed. */
  shiftKey?: boolean;
};

// ============================================================================
// Color Related Types
// ============================================================================

/**
 * Color setting (HEX + alpha).
 *
 * @example
 * { hex: '#ffea00', alpha: 0.5 } // Semi-transparent yellow
 */
export type ColorSetting = {
  /** 6-digit HEX color code (including #). */
  hex: string;
  /** Transparency (alpha) value, range 0-1. */
  alpha: number;
};

// ============================================================================
// User Settings
// ============================================================================

/**
 * The complete structure of user settings.
 *
 * Stored in `browser.storage.sync` and synchronized across devices.
 */
export type UserSettings = {
  /** List of hotkey combinations to open the search panel (supports multiple). */
  hotkeys: HotkeyCombo[];
  /** Highlight color for general search results. */
  matchHighlight: ColorSetting;
  /** Highlight color for the currently selected result. */
  currentHighlight: ColorSetting;
  /** Outline color for the currently selected result. */
  currentOutline: ColorSetting;
  /** Whether to show the outline for the current result. */
  showOutline: boolean;
};
