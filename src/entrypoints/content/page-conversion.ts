/**
 * @fileoverview A service module for converting the entire page's text content
 * between Traditional and Simplified Chinese.
 */

import { converters, ensureConverters } from "../../shared/converter-logic";

/**
 * Converts all text nodes in the document body to either Simplified or Traditional Chinese.
 *
 * @param target The target script, either 'simplified' or 'traditional'.
 *
 * @remarks
 * This function will skip converting text within the following elements to avoid
 * breaking functionality or displaying code incorrectly:
 * - The extension's own UI (`#chinese-find-root`)
 * - `<script>`, `<style>`, `<noscript>`
 * - `<textarea>`, `<code>`, `<pre>`
 */
export async function convertPage(
  target: "simplified" | "traditional",
): Promise<void> {
  await ensureConverters();

  const converter = target === "simplified" ? converters.s : converters.t;
  if (!converter) {
    console.error("[ChineseFind] Converter not available");
    return;
  }

  // Use a TreeWalker to efficiently collect all relevant text nodes.
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        !node.parentElement?.closest(
          "#chinese-find-root, script, style, noscript, textarea, code, pre",
        )
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    },
  );

  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  // Convert each node's value.
  for (const node of nodes) {
    try {
      if (node.nodeValue) {
        node.nodeValue = await converter.convert(node.nodeValue);
      }
    } catch (e) {
      console.error("[ChineseFind] Failed to convert a text node:", e);
    }
  }
}
