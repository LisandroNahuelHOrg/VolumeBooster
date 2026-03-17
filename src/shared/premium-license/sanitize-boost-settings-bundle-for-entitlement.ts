import type { BoostSettingsBundle } from "../boost-settings";
import type { PremiumEntitlementState } from "./premium-license-types";
import { sanitizeAdvancedAudioSettingsForEntitlement } from "./sanitize-advanced-audio-settings-for-entitlement";

export function sanitizeBoostSettingsBundleForEntitlement(
  bundle: BoostSettingsBundle,
  entitlement: PremiumEntitlementState
): BoostSettingsBundle {
  return {
    ...bundle,
    advancedAudioSettings: sanitizeAdvancedAudioSettingsForEntitlement(
      bundle.advancedAudioSettings,
      entitlement
    )
  };
}
