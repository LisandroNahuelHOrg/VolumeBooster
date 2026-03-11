import type { ContentCommand } from "../../shared/messages";
import type { AutoBoosterConfigPayload, AutoFrameTarget } from "../../shared/types";
import { injectRegisteredScriptsIntoTab } from "./inject-registered-scripts-into-tab";
import { sendMessageToFrame } from "./send-message-to-frame";
import { sendMessageToTab } from "./send-message-to-tab";

export async function configureAutoBooster(
  tabId: number,
  payload: AutoBoosterConfigPayload,
  target?: AutoFrameTarget
): Promise<void> {
  const command: ContentCommand = { type: "AUTO_BOOSTER_CONFIGURE", payload };

  if (target) {
    await sendMessageToFrame(tabId, target, command);
    return;
  }

  await injectRegisteredScriptsIntoTab(tabId);
  await sendMessageToTab(tabId, command, 2);
}
