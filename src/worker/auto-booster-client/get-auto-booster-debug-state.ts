import type { AutoBoosterDebugState, AutoFrameTarget } from "../../shared/types";
import { sendMessageToFrame } from "./send-message-to-frame";
import { sendMessageToTab } from "./send-message-to-tab";

export async function getAutoBoosterDebugState(
  tabId: number,
  target?: AutoFrameTarget
): Promise<AutoBoosterDebugState | null> {
  try {
    if (target) {
      return (
        (await sendMessageToFrame<AutoBoosterDebugState | null>(tabId, target, {
          type: "AUTO_BOOSTER_GET_DEBUG_STATE"
        })) ?? null
      );
    }

    return (
      (await sendMessageToTab<AutoBoosterDebugState | null>(tabId, {
        type: "AUTO_BOOSTER_GET_DEBUG_STATE"
      }, 2)) ?? null
    );
  } catch {
    return null;
  }
}
