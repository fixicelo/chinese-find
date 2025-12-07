import {
  getSettings,
  subscribeToSettings,
  Theme,
} from "../../shared/settings-logic";
import "./style.css";

// --- Event Listeners ---

document.getElementById("popup-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSearch();
});
document
  .getElementById("popup-search")
  ?.addEventListener("click", handleSearch);

function handleSearch() {
  const input = document.getElementById(
    "popup-query",
  ) as HTMLInputElement | null;
  const keyword = input?.value.trim() ?? "";
  if (keyword) {
    sendMessageToContentScript({
      type: "chinese-find-open-with-query",
      query: keyword,
    });
  } else {
    sendMessageToContentScript({ type: "chinese-find-open-panel" });
  }
}

// document.getElementById('popup-open')?.addEventListener('click', () => {
//   sendMessageToContentScript({ type: 'chinese-find-open-panel' });
// });

document.getElementById("popup-convert-trad")?.addEventListener("click", () => {
  sendMessageToContentScript({
    type: "chinese-find-convert-page-to-traditional",
  });
});

document.getElementById("popup-convert-simp")?.addEventListener("click", () => {
  sendMessageToContentScript({
    type: "chinese-find-convert-page-to-simplified",
  });
});

document.getElementById("popup-options")?.addEventListener("click", () => {
  // browser.runtime.openOptionsPage();
  browser.windows.create({
    url: browser.runtime.getURL("/options.html"),
    type: "popup",
    width: 1024,
    height: 768,
  });
});

document.getElementById("popup-reload")?.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (tab?.id) {
    await browser.tabs.reload(tab.id);
    window.close();
  }
});

// --- Theme ---
function applyTheme(theme: Theme) {
  document.documentElement.classList.remove("theme-light", "theme-dark");
  if (theme === Theme.Light) {
    document.documentElement.classList.add("theme-light");
  } else if (theme === Theme.Dark) {
    document.documentElement.classList.add("theme-dark");
  }
}

async function main() {
  const settings = await getSettings();
  applyTheme(settings.theme);
  subscribeToSettings((newSettings) => {
    applyTheme(newSettings.theme);
  });

  document.getElementById("popup-query")?.focus();
  checkContentScriptStatus();
}

// --- Helper ---

async function checkContentScriptStatus() {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) return;

    // Try to send a ping message
    await browser.tabs.sendMessage(tab.id, { type: "PING" });
  } catch (err) {
    // If message fails, show warning
    const banner = document.getElementById("warning-banner");
    if (banner) {
      banner.style.display = "flex";
    }
  }
}

async function sendMessageToContentScript(message: object) {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, message);
      window.close();
    }
  } catch (err) {
    console.error(
      "[ChineseFind] Failed to send message to content script",
      err,
    );
    // Maybe show an error to the user in the popup
  }
}

void main();
