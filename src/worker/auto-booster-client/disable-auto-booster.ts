import type { ContentCommand } from "../../shared/messages";
import type { AutoFrameTarget } from "../../shared/types";
import { sendMessageToFrame } from "./send-message-to-frame";
import { sendMessageToTab } from "./send-message-to-tab";

export async function disableAutoBooster(tabId: number, target?: AutoFrameTarget): Promise<void> {
  const command: ContentCommand = {
    type: "AUTO_BOOSTER_DISABLE",
    payload: { tabId }
  };

  try {
    if (target) {
      await sendMessageToFrame(tabId, target, command);
      return;
    }

    await sendMessageToTab(tabId, command);
  } catch {
    // Missing receiver or navigated tab is fine during teardown.
  }
}
