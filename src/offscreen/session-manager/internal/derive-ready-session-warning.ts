import {
  createDefaultMetrics,
  deriveWarningFromMetrics,
  isProtectionBypassedSettings
} from "../../../shared/audio-settings";
import type { AdvancedAudioSettings } from "../../../shared/types";

export const deriveReadySessionWarning = (
  settings: AdvancedAudioSettings
) => deriveWarningFromMetrics(
  createDefaultMetrics(isProtectionBypassedSettings(settings))
);
