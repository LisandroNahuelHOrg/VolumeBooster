import {
  PREMIUM_LICENSE_FORMAT_VERSION,
  PREMIUM_LICENSE_PRODUCT_CODE
} from "./premium-license-constants";
import type {
  PersistedPremiumLicenseActivation,
  PremiumLicenseValidationResult
} from "./premium-license-types";
import { createPremiumLicenseEmailFingerprint } from "./create-premium-license-email-fingerprint";
import { normalizePremiumLicenseEmail } from "./normalize-premium-license-email";
import { normalizePremiumLicenseKey } from "./normalize-premium-license-key";
import { parsePremiumLicenseToken } from "./parse-premium-license-token";
import { premiumLicenseBytesEqual } from "./premium-license-bytes-equal";
import { verifyPremiumLicenseSignature } from "./verify-premium-license-signature";

export async function validatePremiumLicenseActivation(
  activation: PersistedPremiumLicenseActivation
): Promise<PremiumLicenseValidationResult> {
  const normalizedEmail = normalizePremiumLicenseEmail(activation.email);
  const normalizedLicenseKey = normalizePremiumLicenseKey(activation.licenseKey);

  if (!normalizedEmail) {
    return { ok: false, errorKey: "errorPremiumLicenseEmailRequired" };
  }

  if (!normalizedLicenseKey) {
    return { ok: false, errorKey: "errorPremiumLicenseKeyRequired" };
  }

  let token;

  try {
    token = parsePremiumLicenseToken(normalizedLicenseKey);
  } catch {
    return { ok: false, errorKey: "errorPremiumLicenseInvalid" };
  }

  if (
    token.version !== PREMIUM_LICENSE_FORMAT_VERSION ||
    token.productCode !== PREMIUM_LICENSE_PRODUCT_CODE
  ) {
    return { ok: false, errorKey: "errorPremiumLicenseUnsupported" };
  }

  if (token.quantity < 1 || token.seatIndex < 1 || token.seatIndex > token.quantity) {
    return { ok: false, errorKey: "errorPremiumLicenseInvalid" };
  }

  const expectedEmailFingerprint = await createPremiumLicenseEmailFingerprint(normalizedEmail);

  if (!premiumLicenseBytesEqual(token.emailFingerprint, expectedEmailFingerprint)) {
    return { ok: false, errorKey: "errorPremiumLicenseInvalid" };
  }

  if (!(await verifyPremiumLicenseSignature(token))) {
    return { ok: false, errorKey: "errorPremiumLicenseInvalid" };
  }

  return {
    ok: true,
    normalizedEmail,
    normalizedLicenseKey,
    productCode: token.productCode,
    seatIndex: token.seatIndex
  };
}
