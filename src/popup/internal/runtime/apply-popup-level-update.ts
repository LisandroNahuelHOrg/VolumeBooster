import type { LevelUpdatePayload } from "../../../shared/types";
import type { PopupRuntimeState } from "./popup-runtime-types";
import { findPopupSession } from "./find-popup-session";

export function applyPopupLevelUpdate(
  state: Pick<PopupRuntimeState, "currentState">,
  payload: LevelUpdatePayload
): boolean {
  const session = findPopupSession(state, payload.tabId);

  if (!session) {
    return false;
  }

  session.level = payload.level;
  session.warning = payload.warning;
  session.protectorActionDb = payload.protectorActionDb;
  session.clipEvents = payload.clipEvents;
  session.clipPeak = payload.clipPeak;
  session.protectionBypassed = payload.protectionBypassed;
  session.outputPeak = payload.outputPeak;
  session.normalizationInputLoudnessDb = payload.normalizationInputLoudnessDb;
  session.normalizationAppliedGainDb = payload.normalizationAppliedGainDb;
  session.normalizationOffsetScore = payload.normalizationOffsetScore;
  session.normalizationAction = payload.normalizationAction;
  session.normalizationLoadPercent = payload.normalizationLoadPercent;
  return true;
}
