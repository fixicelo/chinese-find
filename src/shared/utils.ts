import { Menu, type Target } from "~/types/messaging";

export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number,
): (...args: T) => void {
  let timeout: number | undefined;
  return (...args: T) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), wait);
  };
}

export async function triggerPageConversion(tabId: number, target: Target) {
  await browser.tabs.sendMessage(tabId, {
    menu: Menu.ConvertPage,
    target,
  });
}
