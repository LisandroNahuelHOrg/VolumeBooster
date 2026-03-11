import type {
  DspRuntimeMetrics,
  LevelWarning
} from "../../../../shared/types";
import type { AudioSessionState } from "../audio-session-state";

export function emitAudioSessionTelemetry(
  state: AudioSessionState,
  level: number,
  warning: LevelWarning,
  metrics: DspRuntimeMetrics
): void {
  state.callbacks.onTelemetry({ level, warning, metrics });
}
