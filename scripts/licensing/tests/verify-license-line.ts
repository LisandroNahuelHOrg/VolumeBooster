import { parsePremiumLicenseToken } from "../../../src/shared/premium-license/parse-premium-license-token";
import { verifyPremiumLicenseSignature } from "../../../src/shared/premium-license/verify-premium-license-signature";

export async function verifyLicenseLine(line: string): Promise<boolean> {
  return verifyPremiumLicenseSignature(parsePremiumLicenseToken(line));
}
