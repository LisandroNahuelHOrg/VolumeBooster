/**
 * @fileoverview Class facade for persisted settings storage operations.
 * @module shared/storage/settings-repository
 */

import {
  SETTINGS_REPOSITORY_STORAGE_AREA,
  type SettingsRepositoryApi,
  type SettingsRepositoryContext,
  type StorageAreaLike
} from "./contracts";
import { settingsRepositoryPrototype } from "./settings-repository-prototype";

export class SettingsRepository implements SettingsRepositoryContext {
  readonly [SETTINGS_REPOSITORY_STORAGE_AREA]: StorageAreaLike;

  constructor(storageArea: StorageAreaLike = chrome.storage.local) {
    this[SETTINGS_REPOSITORY_STORAGE_AREA] = storageArea;
  }
}

export interface SettingsRepository extends SettingsRepositoryApi {}

Object.assign(SettingsRepository.prototype, settingsRepositoryPrototype);
