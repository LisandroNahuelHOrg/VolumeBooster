import { PREMIUM_LICENSE_BASE58_ALPHABET } from "./premium-license-constants";

export function encodePremiumLicenseBase58(value: Uint8Array): string {
  if (value.length === 0) {
    return "";
  }

  const digits = [0];

  for (const byte of value) {
    let carry = byte;

    for (let index = 0; index < digits.length; index += 1) {
      const nextValue = digits[index]! * 256 + carry;
      digits[index] = nextValue % 58;
      carry = Math.floor(nextValue / 58);
    }

    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let encoded = "";

  for (let index = 0; index < value.length && value[index] === 0; index += 1) {
    encoded += PREMIUM_LICENSE_BASE58_ALPHABET[0];
  }

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    encoded += PREMIUM_LICENSE_BASE58_ALPHABET[digits[index]!]!;
  }

  return encoded;
}
