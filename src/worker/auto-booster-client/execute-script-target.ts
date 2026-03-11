import {
  AUTO_BOOSTER_CONTENT_SCRIPT_PATH,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH
} from "../../shared/constants";

export async function executeScriptTarget(tabId: number, target: { allFrames: boolean }): Promise<void> {
  await Promise.all([
    chrome.scripting.executeScript({
      target: { tabId, ...target },
      files: [AUTO_BOOSTER_CONTENT_SCRIPT_PATH]
    }),
    chrome.scripting.executeScript({
      target: { tabId, ...target },
      files: [AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH],
      world: "MAIN"
    })
  ]);
}
