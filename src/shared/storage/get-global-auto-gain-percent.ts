/**
 * @fileoverview Reads the persisted gain used by global auto boosting.
 * @module shared/storage/get-global-auto-gain-percent
 */

import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getGlobalAutoGainPercent(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<number> {
  const settings = await this.getSettings();
  return settings.globalAutoGainPercent;
}
