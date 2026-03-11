import type { ContentCommand } from "../../shared/messages";
import type { AutoFrameTarget } from "../../shared/types";
import { normalizeContentScriptError } from "./normalize-content-script-error";

export async function sendMessageToFrame<T = void>(
  tabId: number,
  target: AutoFrameTarget,
  command: ContentCommand
): Promise<T | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, command, {
      frameId: target.frameId,
      ...(target.documentId ? { documentId: target.documentId } : {})
    })) as T | undefined;
  } catch (error) {
    throw normalizeContentScriptError(error);
  }
}
