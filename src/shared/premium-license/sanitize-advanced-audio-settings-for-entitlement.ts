import type { AdvancedAudioSettings } from "../types";
import { FREEMIUM_ADVANCED_AUDIO_SETTINGS } from "./freemium-advanced-audio-settings";
import type { PremiumEntitlementState } from "./premium-license-types";

export function sanitizeAdvancedAudioSettingsForEntitlement(
  advancedAudioSettings: AdvancedAudioSettings,
  entitlement: PremiumEntitlementState
): AdvancedAudioSettings {
  return entitlement.isPremiumUnlocked
    ? advancedAudioSettings
    : { ...FREEMIUM_ADVANCED_AUDIO_SETTINGS };
}
