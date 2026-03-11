import type { AudioSessionState } from "../audio-session-state";

export function cancelFaustRecovery(state: AudioSessionState): void {
  if (state.faustRecoveryIntervalId !== null) {
    window.clearInterval(state.faustRecoveryIntervalId);
    state.faustRecoveryIntervalId = null;
  }

  state.faustRecoveryInFlight = false;
}
