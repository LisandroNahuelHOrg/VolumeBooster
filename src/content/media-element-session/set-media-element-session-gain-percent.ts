import { createDefaultMetrics, isProtectionBypassedSettings } from "../../shared/audio-settings";
import type { MediaElementSessionState } from "./media-element-session-state";
import { applyMediaElementSessionRuntimeParameters } from "./apply-media-element-session-runtime-parameters";

export function setMediaElementSessionGainPercent(
  state: MediaElementSessionState,
  gainPercent: number
): void {
  state.currentGainPercent = gainPercent;
  state.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(state.currentSettings));
  applyMediaElementSessionRuntimeParameters(state);
}
