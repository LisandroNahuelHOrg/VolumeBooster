/**
 * @fileoverview Covers persisted settings sanitization and storage-backed
 * repository behavior.
 * @module shared/storage.test
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "./audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "./constants";
import { SettingsRepository, type StorageAreaLike } from "./storage";

/**
 * Creates an in-memory `chrome.storage.local` substitute for repository tests.
 * @param seed - Optional starting key-value pairs to preload in the fake store.
 * @returns A storage-like object plus direct access to the backing record.
 */
function createStorageArea(seed?: Record<string, unknown>): StorageAreaLike & { store: Record<string, unknown> } {
  const store = { ...seed };

  return {
    store,
    async get(keys?: string | string[] | null) {
      if (!keys) {
        return { ...store };
      }

      if (typeof keys === "string") {
        return { [keys]: store[keys] };
      }

      return keys.reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = store[key];
        return accumulator;
      }, {});
    },
    async set(items: Record<string, unknown>) {
      Object.assign(store, items);
    }
  };
}

describe("SettingsRepository", () => {
  it("returns defaults when storage is empty or invalid", async () => {
    const emptyRepository = new SettingsRepository(createStorageArea());
    const invalidRepository = new SettingsRepository(
      createStorageArea({
        [SETTINGS_STORAGE_KEY]: "nope"
      })
    );

    await expect(emptyRepository.getSettings()).resolves.toEqual({
      domainGains: {},
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "off",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    });

    await expect(invalidRepository.getSettings()).resolves.toEqual({
      domainGains: {},
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "off",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    });
  });

  it("sanitizes object-shaped settings that omit nested audio settings", async () => {
    const repository = new SettingsRepository(
      createStorageArea({
        [SETTINGS_STORAGE_KEY]: {
          domainGains: "invalid",
          autoBoosterMode: "global",
          globalAutoGainPercent: "300"
        }
      })
    );

    await expect(repository.getSettings()).resolves.toEqual({
      domainGains: {},
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "global",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    });
  });

  it("sanitizes persisted domain gains, audio settings and global mode", async () => {
    const repository = new SettingsRepository(
      createStorageArea({
        [SETTINGS_STORAGE_KEY]: {
          domainGains: {
            "youtube.com": 150,
            "x.com": 15000,
            "broken.com": "bad"
          },
          audioSettings: {
            global: {
              ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
              releaseMs: 999,
              qualityPreset: "custom",
              qualityProtectorMode: "broken"
            }
          },
          autoBoosterMode: "global",
          globalAutoGainPercent: Number.NaN
        }
      })
    );

    await expect(repository.getSettings()).resolves.toEqual({
      domainGains: {
        "youtube.com": 150,
        "x.com": 10000
      },
      audioSettings: {
        global: {
          ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
          qualityPreset: "custom",
          releaseMs: 350
        }
      },
      autoBoosterMode: "global",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    });
  });

  it("forces invalid persisted auto mode and gain back to safe defaults", async () => {
    const repository = new SettingsRepository(
      createStorageArea({
        [SETTINGS_STORAGE_KEY]: {
          domainGains: null,
          audioSettings: {
            global: null
          },
          autoBoosterMode: "site",
          globalAutoGainPercent: -20
        }
      })
    );

    await expect(repository.getSettings()).resolves.toEqual({
      domainGains: {},
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "off",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    });
  });

  it("gets and writes domain gains, removing the entry when it returns to default", async () => {
    const storageArea = createStorageArea();
    const repository = new SettingsRepository(storageArea);

    await expect(repository.getDomainGain(undefined)).resolves.toBeUndefined();

    await repository.setDomainGain("youtube.com", 220);
    await expect(repository.getDomainGain("youtube.com")).resolves.toBe(220);

    await repository.setDomainGain("youtube.com", DEFAULT_GAIN_PERCENT);
    await expect(repository.getDomainGain("youtube.com")).resolves.toBeUndefined();
    expect((storageArea.store[SETTINGS_STORAGE_KEY] as { domainGains: Record<string, number> }).domainGains).toEqual({});
  });

  it("clamps persisted domain gains before storing them", async () => {
    const storageArea = createStorageArea();
    const repository = new SettingsRepository(storageArea);

    await repository.setDomainGain("youtube.com", 15000);
    await repository.setDomainGain("kick.com", -50);

    expect(storageArea.store[SETTINGS_STORAGE_KEY]).toEqual({
      domainGains: {
        "youtube.com": 10000
      },
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "off",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    });
    await expect(repository.getDomainGain("kick.com")).resolves.toBeUndefined();
  });

  it("skips storage work entirely when domain arguments are empty", async () => {
    const storageArea = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    };
    const repository = new SettingsRepository(storageArea);

    await expect(repository.getDomainGain("")).resolves.toBeUndefined();
    await repository.setDomainGain("", 220);
    await repository.removeDomainGain("");

    expect(storageArea.get).not.toHaveBeenCalled();
    expect(storageArea.set).not.toHaveBeenCalled();
  });

  it("removes a stored domain gain and ignores empty domains", async () => {
    const storageArea = createStorageArea({
      [SETTINGS_STORAGE_KEY]: {
        domainGains: {
          "youtube.com": 180
        },
        audioSettings: {
          global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
        },
        autoBoosterMode: "off",
        globalAutoGainPercent: DEFAULT_GAIN_PERCENT
      }
    });
    const repository = new SettingsRepository(storageArea);

    await repository.removeDomainGain(undefined);
    await repository.removeDomainGain("youtube.com");

    expect((storageArea.store[SETTINGS_STORAGE_KEY] as { domainGains: Record<string, number> }).domainGains).toEqual({});
  });

  it("persists global auto mode, gain and merged advanced settings", async () => {
    const repository = new SettingsRepository(createStorageArea());

    await expect(repository.setAutoBoosterMode("global")).resolves.toBe("global");
    await expect(repository.getAutoBoosterMode()).resolves.toBe("global");

    await expect(repository.setGlobalAutoGainPercent(3000)).resolves.toBe(3000);
    await expect(repository.getGlobalAutoGainPercent()).resolves.toBe(3000);

    await expect(
      repository.setAdvancedAudioSettings({
        lookaheadMs: 9,
        qualityPreset: "maximum_clarity"
      })
    ).resolves.toEqual({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      lookaheadMs: 8,
      qualityPreset: "maximum_clarity"
    });

    await expect(repository.getAdvancedAudioSettings()).resolves.toEqual({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      lookaheadMs: 8,
      qualityPreset: "maximum_clarity"
    });
  });

  it("sanitizes writes for global mode, global gain and partial advanced settings", async () => {
    const repository = new SettingsRepository(createStorageArea());

    await expect(repository.setAutoBoosterMode("site" as never)).resolves.toBe("off");
    await expect(repository.setGlobalAutoGainPercent(Number.POSITIVE_INFINITY)).resolves.toBe(DEFAULT_GAIN_PERCENT);
    await expect(
      repository.setAdvancedAudioSettings({
        ceilingDb: 5,
        multibandDepth: -10
      })
    ).resolves.toEqual({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      ceilingDb: -0.3,
      multibandDepth: 0
    });
  });

  it("drops non-finite and non-numeric persisted domain gains", async () => {
    const repository = new SettingsRepository(
      createStorageArea({
        [SETTINGS_STORAGE_KEY]: {
          domainGains: {
            "youtube.com": Number.POSITIVE_INFINITY,
            "kick.com": "220",
            "twitch.tv": 175
          },
          audioSettings: {
            global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
          },
          autoBoosterMode: "off",
          globalAutoGainPercent: DEFAULT_GAIN_PERCENT
        }
      })
    );

    await expect(repository.getSettings()).resolves.toEqual({
      domainGains: {
        "twitch.tv": 175
      },
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "off",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT
    });
  });
});
