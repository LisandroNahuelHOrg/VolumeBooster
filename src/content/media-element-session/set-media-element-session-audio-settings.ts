import { createDefaultMetrics, isProtectionBypassedSettings } from "../../shared/audio-settings";
import type { AdvancedAudioSettings } from "../../shared/types";
import type { MediaElementSessionState } from "./media-element-session-state";
import { applyMediaElementSessionRuntimeParameters } from "./apply-media-element-session-runtime-parameters";

export function setMediaElementSessionAudioSettings(
  state: MediaElementSessionState,
  settings: AdvancedAudioSettings
): void {
  state.currentSettings = settings;
  state.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(settings));
  applyMediaElementSessionRuntimeParameters(state);
}
