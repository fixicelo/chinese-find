/**
 * @fileoverview A shared module for initializing and managing char_converter instances.
 *
 * This module ensures that the converters are initialized only once (singleton pattern)
 * and can be shared across different parts of the content script.
 */

import CharConverter from "char_converter";

export type { default as ConverterInstance } from "char_converter";

/**
 * Lazily-initialized converter instances.
 */
export const converters: {
  /** Converts to Simplified Chinese */
  s: CharConverter | null;
  /** Converts to Traditional Chinese */
  t: CharConverter | null;
} = { s: null, t: null };

/** A promise that resolves when converters are initialized, ensuring it only runs once. */
let convertersPromise: Promise<void> | null = null;

/**
 * Ensures the character converters are initialized and ready to use.
 * Uses a singleton pattern to only initialize once.
 */
export function ensureConverters(): Promise<void> {
  if (converters.s && converters.t) return Promise.resolve();
  if (convertersPromise) return convertersPromise;

  convertersPromise = (async () => {
    try {
      const [toSimplified, toTraditional] = await Promise.all([
        new CharConverter("v2s", "offline"),
        new CharConverter("v2t", "offline"),
      ]);
      converters.s = toSimplified;
      converters.t = toTraditional;
    } catch (e) {
      console.error("[ChineseFind] Failed to load char converters", e);
    }
  })();

  return convertersPromise;
}
