/**
 * @fileoverview The main controller for the search panel UI.
 *
 * This module is responsible for:
 * - Orchestrating the search, highlight, and conversion modules.
 * - Managing the application's state (e.g., matches, currentIndex, search options).
 * - Binding event listeners to the search panel's internal UI elements.
 */

import { converters, ensureConverters } from "../../shared/converter-logic";
import {
  getSettings,
  subscribeToSettings,
  Theme,
} from "../../shared/settings-logic";
import { debounce } from "../../shared/utils";
import { performSearch, type SearchOptions } from "./dom-search";
import * as highlight from "./highlighting";
import { mountHighlightContainer } from "./highlighting";

// ============================================================================
// Module State
// ============================================================================

let panelRoot: ShadowRoot;
let highlightContainer: HTMLElement;

let matches: Range[] = [];
let currentIndex = -1;
let searchGeneration = 0;

const options: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  useRegex: false,
  exactMatch: false,
};

let domObserver: MutationObserver | null = null;
const debouncedObserverSearch = debounce(() => {
  const input = panelRoot.getElementById(
    "chinese-find-input",
  ) as HTMLInputElement;
  const panel = panelRoot.getElementById("chinese-find-panel");
  if (panel?.style.display !== "none" && input?.value) {
    void runSearch(true);
  }
}, 500);

// ============================================================================
// Initialization
// ============================================================================

export function initSearchPanel(root: ShadowRoot): void {
  panelRoot = root;
  highlightContainer = highlight.initHighlightContainer();

  void getSettings().then((settings) => {
    highlight.applyHighlightSettings(settings);
    applyTheme(settings.theme);
    // Initial render after settings are loaded
    highlight.renderHighlights(highlightContainer, matches, currentIndex);
  });

  subscribeToSettings((settings) => {
    highlight.applyHighlightSettings(settings);
    applyTheme(settings.theme);
    // Re-render highlights with new colors
    highlight.renderHighlights(highlightContainer, matches, currentIndex);
  });

  void ensureConverters();
  setupListeners();
  initDomObserver();
  isolatePanelEvents();
}

/**
 * Prevents keyboard events inside the panel from bubbling up to the host page.
 * This is necessary because Shadow DOM retargets events to the host element,
 * causing sites like GitHub to think the user is not typing in an input field.
 */
function isolatePanelEvents(): void {
  const panel = panelRoot.getElementById("chinese-find-panel");
  if (!panel) return;

  const stopPropagation = (e: Event) => e.stopPropagation();

  panel.addEventListener("keydown", stopPropagation);
  panel.addEventListener("keypress", stopPropagation);
  panel.addEventListener("keyup", stopPropagation);
}

function setupListeners(): void {
  const input = panelRoot.getElementById("chinese-find-input");
  input?.addEventListener(
    "input",
    debounce(() => runSearch(), 200),
  );
  input?.addEventListener("keydown", handleEnterNavigation);

  panelRoot
    .getElementById("chinese-find-close")
    ?.addEventListener("click", () => {
      const panel = panelRoot.getElementById("chinese-find-panel");
      if (panel) {
        panel.style.display = "none";
        window.dispatchEvent(
          new CustomEvent("chineseFind:panelToggle", {
            detail: { show: false },
          }),
        );
      }
    });

  panelRoot
    .getElementById("chinese-find-prev")
    ?.addEventListener("click", () => navigate(-1));
  panelRoot
    .getElementById("chinese-find-next")
    ?.addEventListener("click", () => navigate(1));

  panelRoot
    .getElementById("chinese-find-convert-trad")
    ?.addEventListener("click", () => convertInputText("traditional"));
  panelRoot
    .getElementById("chinese-find-convert-simp")
    ?.addEventListener("click", () => convertInputText("simplified"));

  panelRoot
    .querySelectorAll<HTMLButtonElement>(".chinese-find-chip[data-option]")
    .forEach((btn) => {
      const optionName = btn.dataset.option as keyof SearchOptions;
      btn.addEventListener("click", () => {
        options[optionName] = !options[optionName];
        btn.classList.toggle("is-active", options[optionName]);
        btn.setAttribute("aria-pressed", String(options[optionName]));
        void runSearch();
      });
    });

  const refresh = () =>
    highlight.renderHighlights(highlightContainer, matches, currentIndex);
  window.addEventListener("scroll", refresh, { passive: true, capture: true });
  window.addEventListener("resize", refresh, { passive: true, capture: true });

  window.addEventListener("chineseFind:panelToggle", (event: Event) => {
    const detail = (event as CustomEvent<{ show: boolean }>).detail || {};
    if (detail.show) {
      refresh();
      startDomObserver();
    } else {
      highlight.clearAllHighlights(highlightContainer, () => {
        // Only clear matches, don't reset index if panel is just hidden
        matches = [];
      });
      stopDomObserver();
    }
  });
}

export async function applySearchKeyword(keyword: string): Promise<void> {
  const input = panelRoot.getElementById(
    "chinese-find-input",
  ) as HTMLInputElement;
  if (input) {
    input.value = keyword;
    input.focus();
    input.select();
    await runSearch();
  }
}

// ============================================================================
// Theme Logic
// ============================================================================

function applyTheme(theme: Theme) {
  if (!panelRoot) return;

  const host = panelRoot.host as HTMLElement;
  host.classList.remove("theme-light", "theme-dark");

  if (theme === Theme.Light) {
    host.classList.add("theme-light");
  } else if (theme === Theme.Dark) {
    host.classList.add("theme-dark");
  }
}

// ============================================================================
// Search Logic (Controller)
// ============================================================================

async function runSearch(isAutomatic = false): Promise<void> {
  // Defer search until body is ready, as we need it for TreeWalker
  if (!document.body) return;

  const input = panelRoot.getElementById(
    "chinese-find-input",
  ) as HTMLInputElement;
  if (!input) return;

  // Ensure highlight container is in the body before searching & highlighting
  mountHighlightContainer(highlightContainer);

  // Before clearing matches, save the current Range object.
  // This is more stable than saving the index, which can become invalid if the
  // matches array changes after an automatic re-search (e.g., due to DOM mutations).
  const oldCurrentRange =
    currentIndex >= 0 && currentIndex < matches.length
      ? matches[currentIndex]
      : null;

  highlight.clearAllHighlights(highlightContainer, () => {
    matches = [];
    currentIndex = -1;
  });

  const keyword = input.value;
  if (!keyword.trim()) {
    updateCounter();
    return;
  }

  const generation = ++searchGeneration;
  const newMatches = await performSearch(keyword, options);

  if (generation !== searchGeneration) return;

  matches = newMatches;
  if (matches.length > 0) {
    if (isAutomatic) {
      // On automatic re-searches (triggered by DOM changes), we need to restore
      // the user's position. We find the new index of the previously saved Range.
      let newIndex = -1;
      if (oldCurrentRange) {
        // A direct property comparison is a reliable way to find the same Range object.
        newIndex = matches.findIndex(
          (newRange) =>
            newRange.startContainer === oldCurrentRange.startContainer &&
            newRange.endContainer === oldCurrentRange.endContainer &&
            newRange.startOffset === oldCurrentRange.startOffset &&
            newRange.endOffset === oldCurrentRange.endOffset,
        );
      }

      // If we found the old range, use its new index. Otherwise, default to the first item.
      currentIndex = newIndex !== -1 ? newIndex : 0;

      highlight.renderHighlights(highlightContainer, matches, currentIndex);
      updateCounter();
    } else {
      navigate(0);
    }
  } else {
    updateCounter();
  }
}

// ============================================================================
// DOM Mutation Observation
// ============================================================================

function initDomObserver(): void {
  domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        panelRoot.host.contains(mutation.target as Node) ||
        highlightContainer.contains(mutation.target as Node)
      ) {
        continue;
      }
      if (mutation.type === "childList") {
        debouncedObserverSearch();
        return;
      }
    }
  });
}

function startDomObserver(): void {
  if (document.body) {
    domObserver?.observe(document.body, { childList: true, subtree: true });
  }
}

function stopDomObserver(): void {
  domObserver?.disconnect();
}

// ============================================================================
// Navigation & UI
// ============================================================================

function navigate(step: number): void {
  if (matches.length === 0) return;

  currentIndex =
    step === 0 ? 0 : (currentIndex + step + matches.length) % matches.length;

  highlight.renderHighlights(highlightContainer, matches, currentIndex);

  try {
    matches[currentIndex]?.startContainer.parentElement?.scrollIntoView({
      block: "center",
      behavior: "auto",
    });
  } catch {
    /* Range may be invalid */
  }

  updateCounter();
}

function updateCounter(): void {
  const counter = panelRoot.getElementById("chinese-find-counter");
  if (counter) {
    counter.textContent =
      matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : "0";
  }
  panelRoot
    .getElementById("chinese-find-footer")
    ?.toggleAttribute("hidden", matches.length === 0);
}

async function handleEnterNavigation(event: KeyboardEvent): Promise<void> {
  if (event.key !== "Enter") return;
  event.preventDefault();

  if (matches.length === 0) await runSearch();
  if (matches.length > 0) navigate(event.shiftKey ? -1 : 1);
}

// ============================================================================
// Input Text Conversion
// ============================================================================

async function convertInputText(
  target: "simplified" | "traditional",
): Promise<void> {
  await ensureConverters();
  const converter = target === "simplified" ? converters.s : converters.t;
  const input = panelRoot.getElementById(
    "chinese-find-input",
  ) as HTMLInputElement;

  if (!converter || !input || !input.value) return;

  try {
    const convertedText = await converter.convert(input.value);
    if (convertedText !== input.value) {
      input.value = convertedText;
      void runSearch();
    }
  } catch (e) {
    console.error("[ChineseFind] Failed to convert input text:", e);
  }
}
