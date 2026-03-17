import {
  PREMIUM_LICENSE_EMAIL_FINGERPRINT_LENGTH,
  PREMIUM_LICENSE_ORDER_FINGERPRINT_LENGTH,
  PREMIUM_LICENSE_PAYLOAD_LENGTH,
  PREMIUM_LICENSE_SEAT_INDEX_LENGTH,
  PREMIUM_LICENSE_SIGNATURE_LENGTH,
  PREMIUM_LICENSE_TOTAL_LENGTH
} from "./premium-license-constants";
import type { PremiumLicenseTokenParts } from "./premium-license-types";
import { decodePremiumLicenseBase58 } from "./decode-premium-license-base58";
import { xorPremiumLicenseSeatMask } from "./xor-premium-license-seat-mask";

export function parsePremiumLicenseToken(licenseKey: string): PremiumLicenseTokenParts {
  const bytes = decodePremiumLicenseBase58(licenseKey);

  if (bytes.length !== PREMIUM_LICENSE_TOTAL_LENGTH) {
    throw new Error("Invalid premium license length.");
  }

  const seatBytes = bytes.subarray(0, PREMIUM_LICENSE_SEAT_INDEX_LENGTH);
  const seatIndex = ((seatBytes[0] ?? 0) << 8) | (seatBytes[1] ?? 0);
  const body = xorPremiumLicenseSeatMask(
    bytes.subarray(PREMIUM_LICENSE_SEAT_INDEX_LENGTH),
    seatIndex
  );
  const payload = body.subarray(0, PREMIUM_LICENSE_PAYLOAD_LENGTH);
  const signature = body.subarray(
    PREMIUM_LICENSE_PAYLOAD_LENGTH,
    PREMIUM_LICENSE_PAYLOAD_LENGTH + PREMIUM_LICENSE_SIGNATURE_LENGTH
  );

  return {
    bytes,
    payload,
    signature,
    version: payload[0] ?? -1,
    productCode: payload[1] ?? -1,
    emailFingerprint: payload.subarray(2, 2 + PREMIUM_LICENSE_EMAIL_FINGERPRINT_LENGTH),
    orderFingerprint: payload.subarray(
      2 + PREMIUM_LICENSE_EMAIL_FINGERPRINT_LENGTH,
      2 + PREMIUM_LICENSE_EMAIL_FINGERPRINT_LENGTH + PREMIUM_LICENSE_ORDER_FINGERPRINT_LENGTH
    ),
    quantity: ((payload[16] ?? 0) << 8) | (payload[17] ?? 0),
    seatIndex
  };
}
