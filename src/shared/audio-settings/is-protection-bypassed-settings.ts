import type { AdvancedAudioSettings } from "../types";
import { isProtectionBypassedMode } from "./internal/is-protection-bypassed-mode";

/** Indicates whether the current advanced settings bypass protection. */
export function isProtectionBypassedSettings(settings: AdvancedAudioSettings): boolean {
  return isProtectionBypassedMode(settings.qualityProtectorMode);
}
