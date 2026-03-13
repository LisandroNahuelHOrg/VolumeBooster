import type { CaptureSessionState } from "../../../shared/types";
import { postRuntimeMessage } from "./post-runtime-message";

export const publishSessionStatus = (state: CaptureSessionState): void => {
  postRuntimeMessage({
    type: "SESSION_STATUS_UPDATE",
    payload: {
      tabId: state.tabId,
      streamState: state.streamState,
      engineStatus: state.engineStatus,
      gainPercent: state.gainPercent,
      lastError: state.lastError
    }
  });
};
