import { isSupportedTabUrl } from "../../../shared/domain";
import { message } from "../../../shared/messages";

export async function validateTabForAutoBooster(tabId: number): Promise<chrome.tabs.Tab> {
  const targetTab = await chrome.tabs.get(tabId);

  if (!targetTab.id) {
    throw message("errorTabNoLongerExists");
  }

  if (!isSupportedTabUrl(targetTab.url)) {
    throw message("errorTabNotCapturable");
  }

  return targetTab;
}
