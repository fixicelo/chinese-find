import "./style.css";
import {
  colorSettingToRgba,
  DEFAULT_SETTINGS,
  describeHotkey,
  getSettings,
  type HotkeyCombo,
  subscribeToSettings,
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
              <label for="match-color">一般結果</label>
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
              <p>這裡是<span class="preview-highlight">智慧中文搜尋</span>的預覽效果。您可以即時看到<span class="preview-highlight">顏色設定</span>的變更。目前選中的是這個<span class="preview-highlight current">目標</span>。</p>
              <p>這裡是<span class="preview-highlight">智慧中文搜尋</span>的預覽效果。您可以即時看到<span class="preview-highlight">顏色設定</span>的變更。</p>
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
