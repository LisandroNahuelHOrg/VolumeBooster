/**
 * @fileoverview Persists a full settings snapshot into Chrome local storage.
 * @module shared/storage/persist-settings
 */

import { SETTINGS_STORAGE_KEY } from "../constants";
import type { ExtensionSettings } from "../types";
import type { StorageAreaLike } from "./contracts";

export async function persistSettings(storageArea: StorageAreaLike, settings: ExtensionSettings): Promise<void> {
  await storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
}
