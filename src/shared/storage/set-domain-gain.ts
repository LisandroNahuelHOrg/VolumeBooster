/**
 * @fileoverview Persists a domain-specific gain override.
 * @module shared/storage/set-domain-gain
 */

import { DEFAULT_GAIN_PERCENT } from "../constants";
import { clampGainPercent } from "../gain";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";

export async function setDomainGain(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  domain: string | undefined,
  gainPercent: number
): Promise<void> {
  if (!domain) {
    return;
  }

  const settings = await this.getSettings();
  const nextGain = clampGainPercent(gainPercent);

  if (nextGain === DEFAULT_GAIN_PERCENT) {
    delete settings.domainGains[domain];
  } else {
    settings.domainGains[domain] = nextGain;
  }

  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
}
