import { executeScriptTarget } from "./execute-script-target";
import { normalizeContentScriptError } from "./normalize-content-script-error";

export async function injectRegisteredScriptsIntoTab(tabId: number): Promise<void> {
  try {
    await executeScriptTarget(tabId, { allFrames: true });
  } catch {
    try {
      await executeScriptTarget(tabId, { allFrames: false });
    } catch (fallbackError) {
      throw normalizeContentScriptError(fallbackError);
    }
  }
}
