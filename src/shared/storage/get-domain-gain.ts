/**
 * @fileoverview Reads the persisted gain override for a domain.
 * @module shared/storage/get-domain-gain
 */

import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getDomainGain(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  domain?: string
): Promise<number | undefined> {
  if (!domain) {
    return undefined;
  }

  const settings = await this.getSettings();
  return settings.domainGains[domain];
}
