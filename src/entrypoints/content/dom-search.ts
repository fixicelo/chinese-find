/**
 * @fileoverview A pure service module for performing DOM searches.
 *
 * This module implements a "normalization" strategy for searching. Both the
 * user's keyword and the page's text nodes are converted to a standard form
 * (Simplified Chinese) in memory before comparison. This allows for accurate
 * variant-aware searching.
 *
 * It correctly handles mapping match locations from the normalized text back to
 * the original DOM text nodes to create accurate Ranges for highlighting.
 */

import { converters, ensureConverters } from "../../shared/converter-logic";

export type SearchOptions = {
  matchCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  exactMatch: boolean;
};

/**
 * Normalizes a text node's content and creates a source map to track character
 * indices back to the original text. This is crucial for creating accurate
 * DOM Ranges from matches found in the normalized string.
 * @param originalText The original text from the text node.
 * @returns An object containing the normalized text and the index map.
 */
async function getNormalizedTextAndMap(
  originalText: string,
): Promise<{ normalizedText: string; sourceMap: number[] }> {
  if (!converters.s) {
    // If no converter, return original text and a 1:1 map
    const sourceMap = [...new Array(originalText.length).keys()];
    return { normalizedText: originalText, sourceMap };
  }

  const normalizedText = await converters.s.convert(originalText);

  const sourceMap: number[] = new Array(normalizedText.length).fill(-1);
  let originalCodeUnitIndex = 0;
  let normalizedCodeUnitIndex = 0;

  const originalCharacters = Array.from(originalText); // Re-insert declaration
  // ...
  for (const originalChar of originalCharacters) {
    const convertedChar = await converters.s.convert(originalChar);

    // For each code unit in the convertedChar, map it back to the originalCodeUnitIndex
    for (let i = 0; i < convertedChar.length; i++) {
      if (normalizedCodeUnitIndex + i < sourceMap.length) {
        sourceMap[normalizedCodeUnitIndex + i] = originalCodeUnitIndex;
      }
    }

    normalizedCodeUnitIndex += convertedChar.length;
    originalCodeUnitIndex += originalChar.length;
  }
  return { normalizedText, sourceMap };
}

/**
 * Finds all occurrences of a keyword within a text node using the appropriate strategy.
 * @param keyword The user's search term.
 * @param node The text node to search in.
 * @param options The search options.
 * @returns A promise that resolves to an array of `Range` objects.
 */
async function collectMatches(
  keyword: string,
  node: Node,
  options: SearchOptions,
): Promise<Range[]> {
  const originalText = node.textContent;
  if (!originalText) return [];

  // --- Strategy 1: Regular Expression ---
  if (options.useRegex) {
    const localMatches: Range[] = [];
    try {
      const regex = new RegExp(keyword, options.matchCase ? "g" : "gi");
      let match: RegExpExecArray | null; // Explicitly type match
      match = regex.exec(originalText); // Initial assignment
      while (match !== null) {
        if (!match[0]) {
          if (regex.lastIndex === match.index) regex.lastIndex++;
          match = regex.exec(originalText); // Move assignment inside
          continue;
        }
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        localMatches.push(range);
        match = regex.exec(originalText); // Move assignment inside
      }
    } catch (e) {
      console.error("[ChineseFind] Invalid Regex:", e);
      // In the future, we could provide UI feedback for invalid regex.
    }
    return localMatches;
  }

  // --- Strategy 2: Exact Match ---
  if (options.exactMatch) {
    const localMatches: Range[] = [];
    let startIndex = 0;
    while (startIndex < originalText.length) {
      const index = options.matchCase
        ? originalText.indexOf(keyword, startIndex)
        : originalText.toLowerCase().indexOf(keyword.toLowerCase(), startIndex);

      if (index === -1) break;

      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + keyword.length);
      localMatches.push(range);
      startIndex = index + keyword.length;
    }
    return localMatches;
  }

  // --- Strategy 3: Normalization (Default) ---
  await ensureConverters();
  if (!converters.s) return [];

  converters.s.setMode("one2one");
  const normalizedKeyword = await converters.s.convert(
    options.matchCase ? keyword : keyword.toLowerCase(),
  );
  if (!normalizedKeyword) return [];

  const { normalizedText, sourceMap } = await getNormalizedTextAndMap(
    options.matchCase ? originalText : originalText.toLowerCase(),
  );

  const localMatches: Range[] = [];
  let startIndex = 0;
  while (startIndex < normalizedText.length) {
    const index = normalizedText.indexOf(normalizedKeyword, startIndex);
    if (index === -1) break;

    const originalStartIndex = sourceMap[index];

    // To find the end, we need to find the start of the character *after* our match.
    // We must use character-based length, not code-unit based `normalizedKeyword.length`.
    const matchEndIndexInNormalized =
      index + Array.from(normalizedKeyword).length;

    // If the match extends to the end of the normalized text,
    // the end index in the original text is simply its total length.
    const originalEndIndex =
      matchEndIndexInNormalized >= sourceMap.length
        ? originalText.length
        : sourceMap[matchEndIndexInNormalized];

    const range = document.createRange();
    range.setStart(node, originalStartIndex);
    range.setEnd(node, originalEndIndex);
    localMatches.push(range);

    startIndex = index + normalizedKeyword.length;
  }
  return localMatches;
}

/**
 * Performs a search on the page content for a given keyword and options.
 * This is the main entry point for this module.
 * @param keyword The search term.
 * @param options The search options.
 * @returns A promise that resolves to an array of `Range` objects for each visible match.
 */
export async function performSearch(
  keyword: string,
  options: SearchOptions,
): Promise<Range[]> {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return [];
  }

  const matches: Range[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        // Ignore text nodes within our own UI or nodes that are empty.
        !node.parentElement?.closest("#chinese-find-root") &&
        node.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    },
  );

  const nodesToSearch: Node[] = [];
  while (walker.nextNode()) {
    nodesToSearch.push(walker.currentNode);
  }

  const matchPromises = nodesToSearch.map((node) =>
    collectMatches(trimmedKeyword, node, options),
  );
  const results = await Promise.all(matchPromises);
  results.forEach((nodeMatches) => {
    matches.push(...nodeMatches);
  });

  return matches.filter((r) => r.getClientRects().length > 0);
}
