export interface PersistedPremiumLicenseActivation {
  email: string;
  licenseKey: string;
}

export interface PremiumLicenseTokenParts {
  bytes: Uint8Array;
  payload: Uint8Array;
  signature: Uint8Array;
  version: number;
  productCode: number;
  emailFingerprint: Uint8Array;
  orderFingerprint: Uint8Array;
  quantity: number;
  seatIndex: number;
}

export interface PremiumLicenseValidationFailure {
  ok: false;
  errorKey:
    | "errorPremiumLicenseEmailRequired"
    | "errorPremiumLicenseKeyRequired"
    | "errorPremiumLicenseInvalid"
    | "errorPremiumLicenseUnsupported";
}

export interface PremiumLicenseValidationSuccess {
  ok: true;
  normalizedEmail: string;
  normalizedLicenseKey: string;
  productCode: number;
  seatIndex: number;
}

export type PremiumLicenseValidationResult =
  | PremiumLicenseValidationFailure
  | PremiumLicenseValidationSuccess;

export interface PremiumEntitlementState {
  status: "inactive" | "active";
  source: "free" | "trial" | "license";
  storedLicenseStatus: "none" | "valid" | "invalid";
  plan: "free" | "trial" | "lifetime";
  isPremiumUnlocked: boolean;
  email: string | null;
  hasStoredLicense: boolean;
  seatIndex: number | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
}
