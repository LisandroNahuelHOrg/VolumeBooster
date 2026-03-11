/**
 * @fileoverview Reads the persisted automatic booster mode.
 * @module shared/storage/get-auto-booster-mode
 */

import type { AutoBoosterMode } from "../types";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getAutoBoosterMode(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<AutoBoosterMode> {
  const settings = await this.getSettings();
  return settings.autoBoosterMode;
}
