/**
 * @fileoverview Module for managing user settings.
 *
 * This module is responsible for:
 * - Defining default settings.
 * - Reading from, updating, and subscribing to browser storage.
 * - Providing helper functions for colors and hotkeys.
 *
 * @example
 * import { getSettings, updateSettings, colorSettingToRgba } from './settings-logic';
 *
 * const settings = await getSettings();
 * console.log(colorSettingToRgba(settings.matchHighlight)); // 'rgba(255, 234, 0, 0.5)'
 */

import type {
  ColorSetting,
  HotkeyCombo,
  UserSettings,
} from "../types/settings";
import { Theme } from "../types/settings";
export { Theme };
export type { HotkeyCombo, ColorSetting, UserSettings };

/** The key used to store settings in `browser.storage.sync`. */
const STORAGE_KEY = "chineseFindSettings";

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_MATCH_COLOR: ColorSetting = { hex: "#ffea00", alpha: 0.5 };
const DEFAULT_CURRENT_COLOR: ColorSetting = { hex: "#ff9800", alpha: 0.7 };
const DEFAULT_OUTLINE_COLOR: ColorSetting = { hex: "#ff9800", alpha: 1 };

/**
 * Default settings, used for initialization or resetting.
 */
export const DEFAULT_SETTINGS: UserSettings = {
  theme: Theme.System,
  hotkeys: [{ key: "f", ctrlKey: true }],
  matchHighlight: DEFAULT_MATCH_COLOR,
  currentHighlight: DEFAULT_CURRENT_COLOR,
  currentOutline: DEFAULT_OUTLINE_COLOR,
  showOutline: false,
};

// ============================================================================
// Color Helpers
// ============================================================================

/**
 * Converts a HEX color string to an RGB object.
 * @internal
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/**
 * Clamps an alpha value to the 0-1 range.
 * @internal
 */
function clampAlpha(alpha: number): number {
  if (Number.isNaN(alpha)) return 1;
  return Math.min(1, Math.max(0, alpha));
}

/**
 * Converts a ColorSetting object to a CSS rgba() string.
 *
 * @param setting - The color setting object.
 * @returns A CSS rgba string, e.g., 'rgba(255, 234, 0, 0.5)'.
 *
 * @example
 * colorSettingToRgba({ hex: '#ff0000', alpha: 0.8 });
 * // => 'rgba(255, 0, 0, 0.8)'
 */
export function colorSettingToRgba(setting: ColorSetting): string {
  const rgb = hexToRgb(setting.hex);
  if (!rgb) return "rgba(255, 234, 0, 0.5)"; // fallback
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampAlpha(setting.alpha)})`;
}

// ============================================================================
// Hotkey Helpers
// ============================================================================

/**
 * Describes a hotkey combination as a human-readable string.
 *
 * Automatically uses OS-specific symbols:
 * - Mac: ⌃ ⌥ ⇧ ⌘
 * - Windows/Linux: Ctrl Alt Shift Win
 *
 * @param combo - The hotkey combination object.
 * @returns A formatted description string, e.g., 'Ctrl + F' or '⌘ + F'.
 *
 * @example
 * describeHotkey({ key: 'f', ctrlKey: true });
 * // Mac: '⌃ + F'
 * // Windows: 'Ctrl + F'
 */
export function describeHotkey(combo: HotkeyCombo): string {
  const parts: string[] = [];
  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

  if (combo.ctrlKey) parts.push(isMac ? "⌃" : "Ctrl");
  if (combo.altKey) parts.push(isMac ? "⌥" : "Alt");
  if (combo.shiftKey) parts.push(isMac ? "⇧" : "Shift");
  if (combo.metaKey) parts.push(isMac ? "⌘" : "Win");

  const keyNameMap: Record<string, string> = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    " ": "Space",
  };
  parts.push(keyNameMap[combo.key] || combo.key.toUpperCase());

  return parts.join(" + ");
}

// ============================================================================
// Storage Functions
// ============================================================================

/**
 * Reads settings from storage and merges them with defaults.
 *
 * This ensures the returned object is always complete, even if only
 * partial settings are stored.
 *
 * @returns The complete user settings object.
 *
 * @example
 * const settings = await getSettings();
 * console.log(settings.hotkeys); // Will always have a value
 */
export async function getSettings(): Promise<UserSettings> {
  try {
    const res = await browser.storage.sync.get(STORAGE_KEY);
    const stored = res?.[STORAGE_KEY] || {};

    // Deep merge to ensure all fields have values
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      theme: stored.theme || DEFAULT_SETTINGS.theme,
      matchHighlight: {
        ...DEFAULT_SETTINGS.matchHighlight,
        ...(stored.matchHighlight || {}),
      },
      currentHighlight: {
        ...DEFAULT_SETTINGS.currentHighlight,
        ...(stored.currentHighlight || {}),
      },
      currentOutline: {
        ...DEFAULT_SETTINGS.currentOutline,
        ...(stored.currentOutline || {}),
      },
      showOutline:
        stored.showOutline !== undefined
          ? stored.showOutline
          : DEFAULT_SETTINGS.showOutline,
      hotkeys:
        stored.hotkeys && Array.isArray(stored.hotkeys)
          ? stored.hotkeys
          : DEFAULT_SETTINGS.hotkeys,
    };
  } catch (e) {
    console.error(
      "[ChineseFind] Error getting settings, returning defaults.",
      e,
    );
    return DEFAULT_SETTINGS;
  }
}

/**
 * Updates and saves settings (partial update).
 *
 * @param partial - The settings fields to update.
 * @returns The complete, updated settings object.
 *
 * @example
 * await updateSettings({ showOutline: false });
 * await updateSettings({ hotkeys: [{ key: 'g', ctrlKey: true }] });
 */
export async function updateSettings(
  partial: Partial<UserSettings>,
): Promise<UserSettings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await browser.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}

/**
 * Subscribes to settings change events.
 *
 * The callback is invoked whenever settings are updated from any context
 * (including other tabs or device sync).
 *
 * @param callback - The callback function to execute on change.
 * @returns A function to unsubscribe the listener.
 *
 * @example
 * const unsubscribe = subscribeToSettings((newSettings) => {
 *   console.log('Settings changed:', newSettings);
 * });
 *
 * // To unsubscribe later:
 * unsubscribe();
 */
export function subscribeToSettings(
  callback: (settings: UserSettings) => void,
): () => void {
  const listener = (
    changes: Record<string, Browser.storage.StorageChange>,
    area: string,
  ) => {
    if (area === "sync" && changes[STORAGE_KEY]?.newValue) {
      callback(changes[STORAGE_KEY].newValue);
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => {
    browser.storage.onChanged.removeListener(listener);
  };
}
