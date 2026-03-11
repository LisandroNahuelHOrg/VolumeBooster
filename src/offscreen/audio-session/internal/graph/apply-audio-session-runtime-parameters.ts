import {
  applyQualityProtector,
  buildDspRuntimeParameters
} from "../../../../shared/audio-settings";
import { applyFaustRuntimeParameters } from "./apply-faust-runtime-parameters";
import { applyNativeFallbackRuntimeParameters } from "./apply-native-fallback-runtime-parameters";
import type { AudioSessionState } from "../audio-session-state";

export function applyAudioSessionRuntimeParameters(state: AudioSessionState): void {
  const runtime = applyQualityProtector(
    buildDspRuntimeParameters(state.currentGainPercent, state.currentSettings)
  );

  if (state.engineStrategy === "faust" && state.faustNode) {
    applyFaustRuntimeParameters(state, runtime);
    return;
  }

  if (state.fallbackGraph) {
    applyNativeFallbackRuntimeParameters(state.fallbackGraph, runtime);
  }
}
