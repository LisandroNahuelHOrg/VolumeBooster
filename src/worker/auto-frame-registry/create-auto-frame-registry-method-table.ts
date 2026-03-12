import type { AutoFrameRegistryMethods } from "./auto-frame-registry-methods";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { clearTab } from "./clear-tab";
import { getFrameState } from "./get-frame-state";
import { getFrameStates } from "./get-frame-states";
import { getKnownFrames } from "./get-known-frames";
import { getTopFrame } from "./get-top-frame";
import { isToastDismissed } from "./is-toast-dismissed";
import { markToastDismissed } from "./mark-toast-dismissed";
import { markToastVisible } from "./mark-toast-visible";
import { removeFrame } from "./remove-frame";
import { resetToastStateForTab } from "./reset-toast-state-for-tab";
import { updateFrameState } from "./update-frame-state";
import { upsertKnownFrame } from "./upsert-known-frame";

export function createAutoFrameRegistryMethodTable(
  state: AutoFrameRegistryState
): AutoFrameRegistryMethods {
  return {
    upsertKnownFrame: upsertKnownFrame.bind(null, state) as AutoFrameRegistryMethods["upsertKnownFrame"],
    updateFrameState: updateFrameState.bind(null, state) as AutoFrameRegistryMethods["updateFrameState"],
    getKnownFrames: getKnownFrames.bind(null, state) as AutoFrameRegistryMethods["getKnownFrames"],
    getTopFrame: getTopFrame.bind(null, state) as AutoFrameRegistryMethods["getTopFrame"],
    getFrameStates: getFrameStates.bind(null, state) as AutoFrameRegistryMethods["getFrameStates"],
    getFrameState: getFrameState.bind(null, state) as AutoFrameRegistryMethods["getFrameState"],
    removeFrame: removeFrame.bind(null, state) as AutoFrameRegistryMethods["removeFrame"],
    clearTab: clearTab.bind(null, state) as AutoFrameRegistryMethods["clearTab"],
    markToastVisible: markToastVisible.bind(null, state) as AutoFrameRegistryMethods["markToastVisible"],
    markToastDismissed: markToastDismissed.bind(null, state) as AutoFrameRegistryMethods["markToastDismissed"],
    isToastDismissed: isToastDismissed.bind(null, state) as AutoFrameRegistryMethods["isToastDismissed"],
    resetToastStateForTab: resetToastStateForTab.bind(null, state) as AutoFrameRegistryMethods["resetToastStateForTab"]
  };
}
