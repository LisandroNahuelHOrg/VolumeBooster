/**
 * @fileoverview Persistence wrapper for extension settings stored in
 * `chrome.storage.local`.
 * @module shared/storage
 */

import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "./constants";
import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  sanitizeAdvancedAudioSettings
} from "./audio-settings";
import { clampGainPercent } from "./gain";
import type { AdvancedAudioSettings, AutoBoosterMode, ExtensionSettings } from "./types";

/** Minimal async shape required from the storage area implementation. */
export interface StorageAreaLike {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** Central repository for user settings persisted by the extension. */
export class SettingsRepository {
  constructor(private readonly storageArea: StorageAreaLike = chrome.storage.local) {}

  /**
   * Loads the full extension settings object from storage.
   *
   * @returns Sanitized settings with defaults applied for missing or invalid data.
   */
  async getSettings(): Promise<ExtensionSettings> {
    const result = await this.storageArea.get(SETTINGS_STORAGE_KEY);
    const raw = result[SETTINGS_STORAGE_KEY];

    if (!raw || typeof raw !== "object") {
      return this.getDefaultSettings();
    }

    const settings = raw as Partial<ExtensionSettings>;

    return {
      domainGains: this.sanitizeDomainGains(settings.domainGains),
      audioSettings: {
        global: sanitizeAdvancedAudioSettings(settings.audioSettings?.global)
      },
      autoBoosterMode: this.sanitizeAutoBoosterMode(settings.autoBoosterMode),
      globalAutoGainPercent: this.sanitizeGlobalAutoGainPercent(settings.globalAutoGainPercent)
    };
  }

  /**
   * Reads the persisted gain associated with a specific site.
   *
   * @param domain - Site domain.
   * @returns Stored gain for the domain, if any.
   */
  async getDomainGain(domain?: string): Promise<number | undefined> {
    if (!domain) {
      return undefined;
    }

    const settings = await this.getSettings();
    return settings.domainGains[domain];
  }

  /**
   * Persists a gain value for a specific domain. Default gain removes the override.
   *
   * @param domain - Site domain to update.
   * @param gainPercent - Gain value to persist.
   */
  async setDomainGain(domain: string | undefined, gainPercent: number): Promise<void> {
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

    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
  }

  /**
   * Deletes any stored gain override for a domain.
   *
   * @param domain - Site domain to clear.
   */
  async removeDomainGain(domain?: string): Promise<void> {
    if (!domain) {
      return;
    }

    const settings = await this.getSettings();
    delete settings.domainGains[domain];
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
  }

  /** Returns the global advanced audio settings currently stored. */
  async getAdvancedAudioSettings(): Promise<AdvancedAudioSettings> {
    const settings = await this.getSettings();
    return settings.audioSettings.global;
  }

  /** Returns the persisted automatic booster mode. */
  async getAutoBoosterMode(): Promise<AutoBoosterMode> {
    const settings = await this.getSettings();
    return settings.autoBoosterMode;
  }

  /** Returns the gain applied by the global automatic booster mode. */
  async getGlobalAutoGainPercent(): Promise<number> {
    const settings = await this.getSettings();
    return settings.globalAutoGainPercent;
  }

  /**
   * Persists the selected automatic booster mode.
   *
   * @param autoBoosterMode - Desired automatic mode.
   * @returns Sanitized mode stored in settings.
   */
  async setAutoBoosterMode(autoBoosterMode: AutoBoosterMode): Promise<AutoBoosterMode> {
    const settings = await this.getSettings();
    settings.autoBoosterMode = this.sanitizeAutoBoosterMode(autoBoosterMode);
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
    return settings.autoBoosterMode;
  }

  /**
   * Persists the gain used by global automatic boosting.
   *
   * @param gainPercent - New global auto gain value.
   * @returns Sanitized gain value stored in settings.
   */
  async setGlobalAutoGainPercent(gainPercent: number): Promise<number> {
    const settings = await this.getSettings();
    settings.globalAutoGainPercent = this.sanitizeGlobalAutoGainPercent(gainPercent);
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
    return settings.globalAutoGainPercent;
  }

  /**
   * Merges and persists global advanced audio settings.
   *
   * @param audioSettings - Partial update for the current advanced settings.
   * @returns Sanitized settings snapshot after persistence.
   */
  async setAdvancedAudioSettings(audioSettings: Partial<AdvancedAudioSettings>): Promise<AdvancedAudioSettings> {
    const settings = await this.getSettings();
    settings.audioSettings.global = sanitizeAdvancedAudioSettings({
      ...settings.audioSettings.global,
      ...audioSettings
    });
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
    return settings.audioSettings.global;
  }

  /** Creates the default settings object used when storage is empty. */
  private getDefaultSettings(): ExtensionSettings {
    return {
      domainGains: {},
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "off",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    };
  }

  /**
   * Sanitizes persisted domain gain overrides into a clamped numeric map.
   *
   * @param domainGains - Unknown stored value.
   * @returns Safe domain-to-gain mapping.
   */
  private sanitizeDomainGains(domainGains: unknown): Record<string, number> {
    if (!domainGains || typeof domainGains !== "object") {
      return {};
    }

    return Object.entries(domainGains).reduce<Record<string, number>>((accumulator, [domain, value]) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        accumulator[domain] = clampGainPercent(value);
      }

      return accumulator;
    }, {});
  }

  /** Restricts automatic booster mode to the supported persisted values. */
  private sanitizeAutoBoosterMode(value: unknown): AutoBoosterMode {
    return value === "global" ? "global" : "off";
  }

  /** Normalizes the stored global auto gain into the allowed range. */
  private sanitizeGlobalAutoGainPercent(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return DEFAULT_GAIN_PERCENT;
    }

    return clampGainPercent(value);
  }
}
