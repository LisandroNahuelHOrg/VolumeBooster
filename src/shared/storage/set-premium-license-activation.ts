import type { PersistedPremiumLicenseActivation } from "../premium-license";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";
import { sanitizePremiumLicenseActivation } from "./sanitize-premium-license-activation";

export async function setPremiumLicenseActivation(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  activation: PersistedPremiumLicenseActivation
): Promise<PersistedPremiumLicenseActivation | null> {
  const settings = await this.getSettings();
  settings.premiumLicenseActivation = sanitizePremiumLicenseActivation(activation);
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
  return settings.premiumLicenseActivation;
}
