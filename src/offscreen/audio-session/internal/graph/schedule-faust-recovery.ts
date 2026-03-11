import type { AudioSessionState } from "../audio-session-state";
import { FAUST_RECOVERY_RETRY_MS } from "./audio-session-graph-constants";
import { attemptFaustRecovery } from "./attempt-faust-recovery";

export function scheduleFaustRecovery(state: AudioSessionState): void {
  if (state.faustRecoveryIntervalId !== null) {
    return;
  }

  state.faustRecoveryIntervalId = window.setInterval(() => {
    void attemptFaustRecovery(state);
  }, FAUST_RECOVERY_RETRY_MS);
}
