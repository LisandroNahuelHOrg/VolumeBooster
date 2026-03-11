/**
 * @fileoverview Contracts shared across persisted settings storage modules.
 * @module shared/storage/contracts
 */

import type { AdvancedAudioSettings, AutoBoosterMode, ExtensionSettings, PopupTheme } from "../types";

export interface StorageAreaLike {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export const SETTINGS_REPOSITORY_STORAGE_AREA = Symbol("SettingsRepository.storageArea");

export interface SettingsRepositoryContext {
  readonly [SETTINGS_REPOSITORY_STORAGE_AREA]: StorageAreaLike;
}

export interface SettingsRepositoryApi {
  getSettings(this: SettingsRepositoryApi & SettingsRepositoryContext): Promise<ExtensionSettings>;
  getDomainGain(this: SettingsRepositoryApi & SettingsRepositoryContext, domain?: string): Promise<number | undefined>;
  setDomainGain(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    domain: string | undefined,
    gainPercent: number
  ): Promise<void>;
  removeDomainGain(this: SettingsRepositoryApi & SettingsRepositoryContext, domain?: string): Promise<void>;
  getAdvancedAudioSettings(this: SettingsRepositoryApi & SettingsRepositoryContext): Promise<AdvancedAudioSettings>;
  getAutoBoosterMode(this: SettingsRepositoryApi & SettingsRepositoryContext): Promise<AutoBoosterMode>;
  getGlobalAutoGainPercent(this: SettingsRepositoryApi & SettingsRepositoryContext): Promise<number>;
  getPopupTheme(this: SettingsRepositoryApi & SettingsRepositoryContext): Promise<PopupTheme>;
  setAutoBoosterMode(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    autoBoosterMode: AutoBoosterMode
  ): Promise<AutoBoosterMode>;
  setGlobalAutoGainPercent(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    gainPercent: number
  ): Promise<number>;
  setPopupTheme(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    popupTheme: PopupTheme
  ): Promise<PopupTheme>;
  setAdvancedAudioSettings(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    audioSettings: Partial<AdvancedAudioSettings>
  ): Promise<AdvancedAudioSettings>;
}
