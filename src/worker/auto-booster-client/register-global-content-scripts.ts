import { AUTO_BOOSTER_REGISTERED_CONTENT_SCRIPTS } from "./registered-content-scripts";
import { unregisterRegisteredScripts } from "./unregister-registered-scripts";

export async function registerGlobalContentScripts(): Promise<void> {
  await unregisterRegisteredScripts();

  if (typeof chrome.scripting?.registerContentScripts !== "function") {
    return;
  }

  await chrome.scripting.registerContentScripts(
    AUTO_BOOSTER_REGISTERED_CONTENT_SCRIPTS.map((script) => ({
      ...script,
      js: [...script.js],
      matches: [...script.matches]
    }))
  );
}
