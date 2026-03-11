import { AUTO_BOOSTER_REGISTERED_MATCHES } from "../../shared/constants";

export async function queryInjectableTabs(): Promise<chrome.tabs.Tab[]> {
  try {
    return await chrome.tabs.query({
      url: [...AUTO_BOOSTER_REGISTERED_MATCHES]
    });
  } catch {
    return [];
  }
}
