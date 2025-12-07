import {
  getSettings,
  subscribeToSettings,
  Theme,
} from "../../shared/settings-logic";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `
    <main class="popup-shell">
      <header class="popup-header">
        <div class="title-group">
          <img src="/icons/128.png" alt="智慧中文搜尋" />
          <h1 class="popup-title">智慧中文搜尋</h1>
        </div>
        <button id="popup-options" class="button icon-button" title="設定">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path></svg>
        </button>
      </header>
      
      <div id="warning-banner" class="warning-banner">
        <span>請重新整理頁面以啟用擴充功能</span>
        <button id="popup-reload" class="button-link" title="重新整理頁面">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" /></svg>
        </button>
      </div>

      <form id="popup-form" class="popup-form">
        <label class="sr-only" for="popup-query">輸入關鍵字</label>
        <div class="input-wrapper">
          <input id="popup-query" type="text" placeholder="輸入關鍵字…" autocomplete="off" spellcheck="false">
          <button type="submit" class="button primary icon-button" id="popup-search" title="搜尋">
            <span class="search-icon-text">搜</span>
          </button>
        </div>
      </form>

      <div class="divider" role="separator"></div>

      <div class="actions-grid">
        <button type="button" id="popup-convert-trad" class="button secondary">網頁轉繁體</button>
        <button type="button" id="popup-convert-simp" class="button secondary">网页转简体</button>
      </div>
    </main>
  `;
}

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
