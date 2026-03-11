import { AUTO_BOOSTER_REGISTERED_SCRIPT_IDS } from "./registered-content-scripts";

export async function unregisterRegisteredScripts(): Promise<void> {
  if (typeof chrome.scripting?.unregisterContentScripts !== "function") {
    return;
  }

  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [...AUTO_BOOSTER_REGISTERED_SCRIPT_IDS]
    });
  } catch {
    // Registered scripts may not exist yet; cleanup is best-effort.
  }
}
