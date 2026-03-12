import { STATE_POLL_MS } from "../config/popup-runtime-config";
import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";
import { popupStatePollContextRegistry } from "./popup-state-poll-context-registry";
import { popupStatePollIdRef } from "./popup-state-poll-id-ref";
import { runPopupStatePollTick } from "./run-popup-state-poll-tick";

export function startPopupStatePolling(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState
): void {
  if (state.statePollTimer !== null) {
    return;
  }

  popupStatePollIdRef.current += 1;
  popupStatePollContextRegistry.set(popupStatePollIdRef.current, { refs, state });
  state.statePollTimer = refs.window.setInterval(
    runPopupStatePollTick,
    STATE_POLL_MS,
    popupStatePollIdRef.current
  );
}
