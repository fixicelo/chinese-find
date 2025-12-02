/**
 * @fileoverview Content Script Entry Point
 *
 * This script is injected into all web pages. Its sole responsibility is to
 * initialize all the controller modules that make the extension work.
 */
import "./style.css";
import { bindHotkeys, initializeHotkeyController } from "./hotkey-controller";
import { registerMessaging } from "./messaging-controller";
import { mountPanel } from "./panel-controller";
import { initSearchPanel } from "./search-panel";

declare global {
  interface Window {
    /** Flag to prevent duplicate injection. */
    chineseFindInjected?: boolean;
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  main() {
    // 1. Sanity checks to prevent execution in iframes or multiple times.
    if (window.self !== window.top) return;
    if (window.chineseFindInjected) return;
    window.chineseFindInjected = true;

    // 2. Initialize all modules.
    const panelRoot = mountPanel();
    initSearchPanel(panelRoot);

    void initializeHotkeyController();
    bindHotkeys();

    registerMessaging();
  },
});
