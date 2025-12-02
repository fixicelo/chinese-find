import { triggerPageConversion } from "~/shared/utils";
import { Menu, type MenuId, Target } from "~/types/messaging";

export default defineBackground(() => {
  const CONVERT_PAGE_TO_TRADITIONAL_MENU_ID: MenuId =
    "convert-page-to-traditional";
  const CONVERT_PAGE_TO_SIMPLIFIED_MENU_ID: MenuId =
    "convert-page-to-simplified";
  const SEARCH_SELECTION_MENU_ID: MenuId = "search-selection";

  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "parent-menu",
      title: "智慧中文搜尋",
      contexts: ["page", "selection"],
    });

    browser.contextMenus.create({
      id: CONVERT_PAGE_TO_TRADITIONAL_MENU_ID,
      parentId: "parent-menu",
      title: "轉換網頁為繁體",
      contexts: ["page"],
    });

    browser.contextMenus.create({
      id: CONVERT_PAGE_TO_SIMPLIFIED_MENU_ID,
      parentId: "parent-menu",
      title: "转换网页为简体",
      contexts: ["page"],
    });

    browser.contextMenus.create({
      id: "separator",
      parentId: "parent-menu",
      type: "separator",
      contexts: ["selection"],
    });

    browser.contextMenus.create({
      id: SEARCH_SELECTION_MENU_ID,
      parentId: "parent-menu",
      title: "搜尋選取的文字",
      contexts: ["selection"],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    const tabId = tab?.id;
    if (!tabId) {
      return;
    }
    const menuId = info.menuItemId as MenuId;

    if (menuId === CONVERT_PAGE_TO_TRADITIONAL_MENU_ID) {
      await triggerPageConversion(tabId, Target.Traditional);
    } else if (menuId === CONVERT_PAGE_TO_SIMPLIFIED_MENU_ID) {
      await triggerPageConversion(tabId, Target.Simplified);
    } else if (menuId === SEARCH_SELECTION_MENU_ID) {
      const selectionText = info.selectionText;
      if (selectionText) {
        await browser.tabs.sendMessage(tabId, {
          menu: Menu.SearchSelection,
          text: selectionText,
        });
      }
    }
  });
});
