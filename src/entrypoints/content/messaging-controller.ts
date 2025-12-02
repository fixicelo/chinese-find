import { Menu, Target } from "~/types/messaging";
import { convertPage } from "./page-conversion";
import { togglePanel } from "./panel-controller";
import { applySearchKeyword } from "./search-panel";

/**
 * Registers a listener for messages from other parts of the extension (e.g., popup, background).
 */
export function registerMessaging(): void {
  browser.runtime.onMessage.addListener(async (message) => {
    if (typeof message !== "object" || !message) return;

    if (message.menu === Menu.ConvertPage) {
      if (message.target === Target.Traditional) {
        convertPage(Target.Traditional);
      } else if (message.target === Target.Simplified) {
        convertPage(Target.Simplified);
      }
    } else if (message.menu === Menu.SearchSelection) {
      if (typeof message.text === "string") {
        await applySearchKeyword(message.text);
      }
      togglePanel(true);
    }

    switch (message.type) {
      case "chinese-find-open-panel":
        togglePanel(true);
        break;

      case "chinese-find-open-with-query":
        togglePanel(true);
        if (typeof message.query === "string") {
          applySearchKeyword(message.query);
        }
        break;

      case "chinese-find-convert-page-to-simplified":
        convertPage("simplified");
        break;

      case "chinese-find-convert-page-to-traditional":
        convertPage("traditional");
        break;
    }
  });
}
