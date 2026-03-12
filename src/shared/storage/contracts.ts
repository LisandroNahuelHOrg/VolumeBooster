/**
 * @fileoverview Contracts shared across persisted settings storage modules.
 * @module shared/storage/contracts
 */

import type { BoostSettingsBundle } from "../boost-settings-bundle";
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
  getDomainBoostSettingsBundle(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    domain?: string
  ): Promise<BoostSettingsBundle | null>;
  getGlobalBoostSettingsBundle(this: SettingsRepositoryApi & SettingsRepositoryContext): Promise<BoostSettingsBundle>;
  setDomainGain(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    domain: string | undefined,
    gainPercent: number
  ): Promise<void>;
  setDomainBoostSettingsBundle(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    domain: string | undefined,
    bundle: BoostSettingsBundle
  ): Promise<void>;
  removeDomainGain(this: SettingsRepositoryApi & SettingsRepositoryContext, domain?: string): Promise<void>;
  removeDomainBoostSettingsBundle(this: SettingsRepositoryApi & SettingsRepositoryContext, domain?: string): Promise<void>;
  clearDomainBoostSettingsBundles(this: SettingsRepositoryApi & SettingsRepositoryContext): Promise<void>;
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
  setGlobalBoostSettingsBundle(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    bundle: BoostSettingsBundle
  ): Promise<BoostSettingsBundle>;
  setPopupTheme(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    popupTheme: PopupTheme
  ): Promise<PopupTheme>;
  setAdvancedAudioSettings(
    this: SettingsRepositoryApi & SettingsRepositoryContext,
    audioSettings: Partial<AdvancedAudioSettings>
  ): Promise<AdvancedAudioSettings>;
}
