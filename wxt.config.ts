import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "智慧中文搜尋",
    description: "自動識別繁、簡、異體字，讓您的頁面搜尋（Ctrl+F）再無障礙。",
    permissions: ["activeTab", "storage", "contextMenus"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "智慧中文搜尋",
    },
    icons: {
      "16": "/icons/16.png",
      "32": "/icons/32.png",
      "48": "/icons/48.png",
      "128": "/icons/128.png",
    },
  },
  // modules: ["@wxt-dev/auto-icons"],
});
