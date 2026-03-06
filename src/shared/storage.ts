import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "./constants";
import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  sanitizeAdvancedAudioSettings
} from "./audio-settings";
import { clampGainPercent } from "./gain";
import type { AdvancedAudioSettings, AutoBoosterMode, ExtensionSettings } from "./types";

export interface StorageAreaLike {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export class SettingsRepository {
  constructor(private readonly storageArea: StorageAreaLike = chrome.storage.local) {}

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

  async getDomainGain(domain?: string): Promise<number | undefined> {
    if (!domain) {
      return undefined;
    }

    const settings = await this.getSettings();
    return settings.domainGains[domain];
  }

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

  async removeDomainGain(domain?: string): Promise<void> {
    if (!domain) {
      return;
    }

    const settings = await this.getSettings();
    delete settings.domainGains[domain];
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
  }

  async getAdvancedAudioSettings(): Promise<AdvancedAudioSettings> {
    const settings = await this.getSettings();
    return settings.audioSettings.global;
  }

  async getAutoBoosterMode(): Promise<AutoBoosterMode> {
    const settings = await this.getSettings();
    return settings.autoBoosterMode;
  }

  async getGlobalAutoGainPercent(): Promise<number> {
    const settings = await this.getSettings();
    return settings.globalAutoGainPercent;
  }

  async setAutoBoosterMode(autoBoosterMode: AutoBoosterMode): Promise<AutoBoosterMode> {
    const settings = await this.getSettings();
    settings.autoBoosterMode = this.sanitizeAutoBoosterMode(autoBoosterMode);
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
    return settings.autoBoosterMode;
  }

  async setGlobalAutoGainPercent(gainPercent: number): Promise<number> {
    const settings = await this.getSettings();
    settings.globalAutoGainPercent = this.sanitizeGlobalAutoGainPercent(gainPercent);
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
    return settings.globalAutoGainPercent;
  }

  async setAdvancedAudioSettings(audioSettings: Partial<AdvancedAudioSettings>): Promise<AdvancedAudioSettings> {
    const settings = await this.getSettings();
    settings.audioSettings.global = sanitizeAdvancedAudioSettings({
      ...settings.audioSettings.global,
      ...audioSettings
    });
    await this.storageArea.set({ [SETTINGS_STORAGE_KEY]: settings });
    return settings.audioSettings.global;
  }

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

  private sanitizeAutoBoosterMode(value: unknown): AutoBoosterMode {
    return value === "global" ? "global" : "off";
  }

  private sanitizeGlobalAutoGainPercent(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return DEFAULT_GAIN_PERCENT;
    }

    return clampGainPercent(value);
  }
}
