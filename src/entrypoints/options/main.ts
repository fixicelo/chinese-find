import "./style.css";
import {
  colorSettingToRgba,
  DEFAULT_SETTINGS,
  describeHotkey,
  getSettings,
  type HotkeyCombo,
  subscribeToSettings,
  Theme,
  type UserSettings,
  updateSettings,
} from "../../shared/settings-logic";
import { debounce } from "../../shared/utils";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `
    <div class="options-shell">
      <header class="app-header">
        <div class="header-content">
          <h1 class="app-title">
            <img src="/icons/128.png" alt="智慧中文搜尋" />
            <span>智慧中文搜尋</span>
          </h1>
          <div class="header-actions">
            <span id="save-status" class="save-status"></span>
            <button class="button" id="reset-all">全部重設</button>
          </div>
        </div>
      </header>
      <main class="main-content">
        <div class="settings-grid">
          <section class="options-card">
            <h2 class="card-title">外觀設定</h2>
            <div class="field-group">
              <label for="match-color">搜尋結果</label>
              <div class="color-control">
                <div class="color-picker-wrapper"><input type="color" id="match-color" /></div>
                <input type="range" id="match-alpha" min="0" max="1" step="0.05" />
                <span id="match-alpha-value" class="color-alpha-value"></span>
              </div>
            </div>
            <div class="field-group">
              <label for="current-color">目前結果</label>
              <div class="color-control">
                <div class="color-picker-wrapper"><input type="color" id="current-color" /></div>
                <input type="range" id="current-alpha" min="0" max="1" step="0.05" />
                <span id="current-alpha-value" class="color-alpha-value"></span>
              </div>
            </div>
            <div class="field-group">
              <label for="outline-color">目前結果外框</label>
              <div class="color-control">
                <div class="color-picker-wrapper"><input type="color" id="outline-color" /></div>
                <input type="range" id="outline-alpha" min="0" max="1" step="0.05" />
                <span id="outline-alpha-value" class="color-alpha-value"></span>
              </div>
            </div>
            <div class="field-group">
                <div class="toggle-control">
                    <label for="show-outline">顯示外框</label>
                    <label class="switch">
                        <input type="checkbox" id="show-outline">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
          </section>
          <section class="options-card">
            <h2 class="card-title">即時預覽</h2>
            <div class="preview-pane" id="preview-pane">
              <p>這裡是<strong>智慧中文搜尋</strong>的預覽效果。您可以即時看到並修改<span class="preview-highlight">搜尋結果</span>的顏色。</p>
              <p>以及當前選中的<span class="preview-highlight current">目前結果</span>的顏色。</p>
            </div>
          </section>
          <section class="options-card">
            <h2 class="card-title">主題</h2>
            <div class="card-content">
              <fieldset class="theme-selector">
                <legend class="sr-only">選擇主題</legend>
                <div>
                  <input type="radio" id="theme-system" name="theme" value="system" />
                  <label for="theme-system">
                    <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    <span>跟隨系統</span>
                  </label>
                </div>
                <div>
                  <input type="radio" id="theme-light" name="theme" value="light" />
                  <label for="theme-light">
                    <svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 1-4.995 5.249A5.002 5.002 0 0 1 12 7Zm0-2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-8 9h2m14 0h2M12 2v2m0 16v2M4.222 4.222l1.414 1.414m12.728 12.728 1.414 1.414M4.222 19.778l1.414-1.414m12.728-12.728 1.414-1.414"></path></svg>
                    <span>淺色</span>
                  </label>
                </div>
                <div>
                  <input type="radio" id="theme-dark" name="theme" value="dark" />
                  <label for="theme-dark">
                    <svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 1 7.156-14.156A7 7 0 1 0 12 21Z"></path></svg>
                    <span>深色</span>
                  </label>
                </div>
              </fieldset>
            </div>
          </section>
          <section class="options-card options-hotkeys" id="hotkey-card">
            <h2 class="card-title">快捷鍵</h2>
            <div class="card-content">
              <p class="capture-hint" id="hotkey-hint">點擊下方按鈕新增快捷鍵，即可在任何頁面開啟搜尋面板。</p>
              <ul class="hotkey-list" id="hotkey-list"></ul>
            </div>
            <div class="card-footer">
              <button class="button primary" id="hotkey-add">
                <span>新增快捷鍵</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  `;
}

// --- DOM Element Selection ---
const dom = {
  themeSystem: document.querySelector<HTMLInputElement>("#theme-system"),
  themeLight: document.querySelector<HTMLInputElement>("#theme-light"),
  themeDark: document.querySelector<HTMLInputElement>("#theme-dark"),
  previewPane: document.getElementById("preview-pane"),
  matchColor: document.querySelector<HTMLInputElement>("#match-color"),
  matchAlpha: document.querySelector<HTMLInputElement>("#match-alpha"),
  matchAlphaValue:
    document.querySelector<HTMLSpanElement>("#match-alpha-value"),
  currentColor: document.querySelector<HTMLInputElement>("#current-color"),
  currentAlpha: document.querySelector<HTMLInputElement>("#current-alpha"),
  currentAlphaValue: document.querySelector<HTMLSpanElement>(
    "#current-alpha-value",
  ),
  outlineColor: document.querySelector<HTMLInputElement>("#outline-color"),
  outlineAlpha: document.querySelector<HTMLInputElement>("#outline-alpha"),
  outlineAlphaValue: document.querySelector<HTMLSpanElement>(
    "#outline-alpha-value",
  ),
  showOutline: document.querySelector<HTMLInputElement>("#show-outline"),
  hotkeyList: document.querySelector<HTMLUListElement>("#hotkey-list"),
  hotkeyHint: document.querySelector<HTMLParagraphElement>("#hotkey-hint"),
  hotkeyAdd: document.querySelector<HTMLButtonElement>("#hotkey-add"),
  resetAll: document.querySelector<HTMLButtonElement>("#reset-all"),
  hotkeyCard: document.getElementById("hotkey-card"),
  saveStatus: document.getElementById("save-status"),
};

let isCapturingHotkey = false;
let currentSettings: UserSettings | null = null;

// --- Core Logic ---

function hydrateUI(s: UserSettings) {
  if (!s) return;
  currentSettings = s;
  applyTheme(s.theme);
  // Theme
  if (dom.themeSystem) dom.themeSystem.checked = s.theme === Theme.System;
  if (dom.themeLight) dom.themeLight.checked = s.theme === Theme.Light;
  if (dom.themeDark) dom.themeDark.checked = s.theme === Theme.Dark;

  // Colors
  if (dom.matchColor) dom.matchColor.value = s.matchHighlight.hex;
  if (dom.matchAlpha) dom.matchAlpha.value = s.matchHighlight.alpha.toString();
  if (dom.matchAlphaValue)
    dom.matchAlphaValue.textContent = formatAlpha(s.matchHighlight.alpha);
  if (dom.currentColor) dom.currentColor.value = s.currentHighlight.hex;
  if (dom.currentAlpha)
    dom.currentAlpha.value = s.currentHighlight.alpha.toString();
  if (dom.currentAlphaValue)
    dom.currentAlphaValue.textContent = formatAlpha(s.currentHighlight.alpha);
  if (dom.outlineColor) dom.outlineColor.value = s.currentOutline.hex;
  if (dom.outlineAlpha)
    dom.outlineAlpha.value = s.currentOutline.alpha.toString();
  if (dom.outlineAlphaValue)
    dom.outlineAlphaValue.textContent = formatAlpha(s.currentOutline.alpha);
  if (dom.showOutline) dom.showOutline.checked = s.showOutline;
  updatePreview(s);

  // Hotkeys
  if (!dom.hotkeyList) return;
  dom.hotkeyList.innerHTML = "";
  s.hotkeys.forEach((combo) => {
    const li = document.createElement("li");
    const desc = describeHotkey(combo)
      .split("+")
      .map((k) => `<kbd>${k.trim()}</kbd>`)
      .join('<span class="plus-sign">+</span>');
    li.innerHTML = `<span>${desc}</span>`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1H2V3zm2 2h8v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z" /></svg>`;
    removeBtn.className = "button icon-button destructive";
    removeBtn.title = "移除此快捷鍵";
    removeBtn.disabled = s.hotkeys.length <= 1;
    removeBtn.addEventListener("click", () => {
      const next = s.hotkeys.filter((c) => c !== combo);
      void updateSettings({ hotkeys: next });
    });
    li.appendChild(removeBtn);
    dom.hotkeyList?.appendChild(li);
  });
}

function updatePreview(s: UserSettings) {
  if (!dom.previewPane) return;
  dom.previewPane.style.setProperty(
    "--preview-match-bg",
    colorSettingToRgba(s.matchHighlight),
  );
  dom.previewPane.style.setProperty(
    "--preview-current-bg",
    colorSettingToRgba(s.currentHighlight),
  );
  const outlineColor = s.showOutline
    ? colorSettingToRgba(s.currentOutline)
    : "transparent";
  dom.previewPane.style.setProperty("--preview-current-outline", outlineColor);
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove("theme-light", "theme-dark");
  if (theme === Theme.Light) {
    document.documentElement.classList.add("theme-light");
  } else if (theme === Theme.Dark) {
    document.documentElement.classList.add("theme-dark");
  }
}

// --- Event Listeners Setup ---

function setupListeners() {
  const onColorChange = () => {
    const newSettings: Partial<UserSettings> = {};

    if (dom.matchColor && dom.matchAlpha) {
      newSettings.matchHighlight = {
        hex: dom.matchColor.value,
        alpha: dom.matchAlpha.valueAsNumber,
      };
    }
    if (dom.currentColor && dom.currentAlpha) {
      newSettings.currentHighlight = {
        hex: dom.currentColor.value,
        alpha: dom.currentAlpha.valueAsNumber,
      };
    }
    if (dom.outlineColor && dom.outlineAlpha) {
      newSettings.currentOutline = {
        hex: dom.outlineColor.value,
        alpha: dom.outlineAlpha.valueAsNumber,
      };
    }
    if (dom.showOutline) {
      newSettings.showOutline = dom.showOutline.checked;
    }
    updatePreview({ ...(currentSettings || DEFAULT_SETTINGS), ...newSettings });
    debouncedSave(newSettings);
  };

  const onThemeChange = () => {
    let theme = Theme.System;
    if (dom.themeLight?.checked) theme = Theme.Light;
    if (dom.themeDark?.checked) theme = Theme.Dark;
    debouncedSave({ theme });
  };

  dom.themeSystem?.addEventListener("change", onThemeChange);
  dom.themeLight?.addEventListener("change", onThemeChange);
  dom.themeDark?.addEventListener("change", onThemeChange);

  dom.matchColor?.addEventListener("input", onColorChange);
  dom.matchAlpha?.addEventListener("input", onColorChange);
  dom.currentColor?.addEventListener("input", onColorChange);
  dom.currentAlpha?.addEventListener("input", onColorChange);
  dom.outlineColor?.addEventListener("input", onColorChange);
  dom.outlineAlpha?.addEventListener("input", onColorChange);
  dom.showOutline?.addEventListener("change", onColorChange);

  dom.resetAll?.addEventListener("click", () => {
    if (confirm("您確定要將所有設定重設為預設值嗎？")) {
      updateSettings(DEFAULT_SETTINGS).then(hydrateUI);
    }
  });
  dom.hotkeyAdd?.addEventListener("click", () => startHotkeyCapture());
}

const debouncedSave = debounce((partial: Partial<UserSettings>) => {
  updateSettings(partial)
    .then(() => showSaveStatus("已儲存"))
    .catch((err) => {
      console.error("[ChineseFind] Failed to save settings", err);
      showSaveStatus("儲存失敗!", true);
    });
}, 300);

async function startHotkeyCapture() {
  if (isCapturingHotkey || !dom.hotkeyCard || !dom.hotkeyAdd || !dom.hotkeyHint)
    return;
  isCapturingHotkey = true;
  dom.hotkeyCard.classList.add("is-capturing");
  dom.hotkeyHint.textContent = "請按下想設定的組合鍵，或按 Esc 取消";
  dom.hotkeyAdd.disabled = true;

  const currentSettings = await getSettings();

  const onKeyDown = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      finishHotkeyCapture("已取消新增");
      return;
    }
    const key = event.key;
    if (["Shift", "Control", "Alt", "Meta"].includes(key)) return;
    const combo: HotkeyCombo = {
      key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
    };
    const hasExisting = currentSettings.hotkeys.some(
      (c) =>
        c.key === combo.key &&
        !!c.ctrlKey === !!combo.ctrlKey &&
        !!c.metaKey === !!combo.metaKey &&
        !!c.altKey === !!combo.altKey &&
        !!c.shiftKey === !!combo.shiftKey,
    );

    if (hasExisting) {
      finishHotkeyCapture("此快捷鍵已存在");
      return;
    }
    const next = [...currentSettings.hotkeys, combo];
    updateSettings({ hotkeys: next }).then(() =>
      finishHotkeyCapture("已新增快捷鍵"),
    );
  };

  const finishHotkeyCapture = (message: string) => {
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    dom.hotkeyCard?.classList.remove("is-capturing");
    dom.hotkeyAdd?.removeAttribute("disabled");
    if (dom.hotkeyHint) {
      dom.hotkeyHint.textContent = message;
      setTimeout(() => {
        if (!isCapturingHotkey && dom.hotkeyHint)
          dom.hotkeyHint.textContent =
            "點擊下方按鈕新增快捷鍵，即可在任何頁面開啟搜尋面板。";
      }, 2500);
    }
    isCapturingHotkey = false;
  };

  window.addEventListener("keydown", onKeyDown, { capture: true });
}

let saveStatusTimeout: number;
function showSaveStatus(message: string, isError = false) {
  if (!dom.saveStatus) return;
  dom.saveStatus.textContent = message;
  dom.saveStatus.classList.toggle("error", isError);
  dom.saveStatus.classList.add("visible");
  clearTimeout(saveStatusTimeout);
  saveStatusTimeout = window.setTimeout(
    () => dom.saveStatus?.classList.remove("visible"),
    2000,
  );
}

function formatAlpha(alpha: number): string {
  return `${Math.round(alpha * 100)}%`;
}

// --- Initialization ---
async function main() {
  const settings = await getSettings();
  hydrateUI(settings);
  setupListeners();
  subscribeToSettings((newSettings) => {
    hydrateUI(newSettings);
    showSaveStatus("設定已同步");
  });
}

void main();
