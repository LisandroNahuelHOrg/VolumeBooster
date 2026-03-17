import type { PersistedPremiumLicenseActivation } from "../premium-license";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getPremiumLicenseActivation(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<PersistedPremiumLicenseActivation | null> {
  return (await this.getSettings()).premiumLicenseActivation ?? null;
}
