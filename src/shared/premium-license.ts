export {
  PREMIUM_LICENSE_PUBLIC_KEY_BYTES,
  PREMIUM_LICENSE_FORMAT_VERSION,
  PREMIUM_LICENSE_PRODUCT_CODE,
  PREMIUM_LICENSE_PAYLOAD_LENGTH,
  PREMIUM_LICENSE_SIGNATURE_LENGTH,
  PREMIUM_LICENSE_TOTAL_LENGTH
} from "./premium-license/premium-license-constants";
export { DEFAULT_PREMIUM_ENTITLEMENT_STATE } from "./premium-license/default-premium-entitlement-state";
export type {
  PersistedPremiumLicenseActivation,
  PremiumEntitlementState,
  PremiumLicenseTokenParts,
  PremiumLicenseValidationResult
} from "./premium-license/premium-license-types";
export { createPremiumLicenseEmailFingerprint } from "./premium-license/create-premium-license-email-fingerprint";
export { createPremiumLicenseOrderFingerprint } from "./premium-license/create-premium-license-order-fingerprint";
export { decodePremiumLicenseBase58 } from "./premium-license/decode-premium-license-base58";
export { encodePremiumLicenseBase58 } from "./premium-license/encode-premium-license-base58";
export { normalizePremiumLicenseEmail } from "./premium-license/normalize-premium-license-email";
export { normalizePremiumLicenseKey } from "./premium-license/normalize-premium-license-key";
export { parsePremiumLicenseToken } from "./premium-license/parse-premium-license-token";
export type { PremiumFeatureAccess } from "./premium-license/premium-feature-access-types";
export { FREEMIUM_ADVANCED_AUDIO_SETTINGS } from "./premium-license/freemium-advanced-audio-settings";
export { resolvePremiumFeatureAccess } from "./premium-license/resolve-premium-feature-access";
export { resolvePremiumEntitlementState } from "./premium-license/resolve-premium-entitlement-state";
export { sanitizeAdvancedAudioSettingsForEntitlement } from "./premium-license/sanitize-advanced-audio-settings-for-entitlement";
export { sanitizeBoostSettingsBundleForEntitlement } from "./premium-license/sanitize-boost-settings-bundle-for-entitlement";
export { validatePremiumLicenseActivation } from "./premium-license/validate-premium-license-activation";
