/**
 * @fileoverview Deletes a persisted domain-specific gain override.
 * @module shared/storage/remove-domain-gain
 */

import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";

export async function removeDomainGain(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  domain?: string
): Promise<void> {
  if (!domain) {
    return;
  }

  const settings = await this.getSettings();
  delete settings.domainGains[domain];
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
}
