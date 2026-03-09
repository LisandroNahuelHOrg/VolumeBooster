import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  applyQualityPreset
} from "../shared/audio-settings";
import { SettingsRepository } from "../shared/storage";
import type { CaptureSessionState, RuntimeResponse, WorkerState } from "../shared/types";
import { WorkerOrchestrator } from "./orchestrator";

function createMemoryStorage() {
  const store: Record<string, unknown> = {};

  return {
    area: {
      async get(key?: string | string[] | null) {
        if (!key) {
          return { ...store };
        }

        if (typeof key === "string") {
          return { [key]: store[key] };
        }

        return key.reduce<Record<string, unknown>>((accumulator, currentKey) => {
          accumulator[currentKey] = store[currentKey];
          return accumulator;
        }, {});
      },
      async set(items: Record<string, unknown>) {
        Object.assign(store, items);
      }
    }
  };
}

function makeSession(tabId: number, domain: string, gainPercent: number): CaptureSessionState {
  return {
    tabId,
    title: `Tab ${tabId}`,
    url: `https://${domain}/video`,
    domain,
    gainPercent,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.2,
    warning: "none",
    protectorActionDb: 3.8,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.72,
    updatedAt: Date.now()
  };
}

describe("WorkerOrchestrator", () => {
  const runtimeSendMessage = vi.fn();
  const tabsGet = vi.fn();
  const tabsQuery = vi.fn();
  const getMediaStreamId = vi.fn();
  const actionSetBadgeText = vi.fn();
  const actionSetBadgeTextColor = vi.fn();
  const actionSetBadgeBackgroundColor = vi.fn();

  beforeEach(() => {
    runtimeSendMessage.mockReset();
    tabsGet.mockReset();
    tabsQuery.mockReset();
    getMediaStreamId.mockReset();
    actionSetBadgeText.mockReset();
    actionSetBadgeTextColor.mockReset();
    actionSetBadgeBackgroundColor.mockReset();

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          sendMessage: runtimeSendMessage
        },
        action: {
          setBadgeText: actionSetBadgeText,
          setBadgeTextColor: actionSetBadgeTextColor,
          setBadgeBackgroundColor: actionSetBadgeBackgroundColor
        },
        tabs: {
          get: tabsGet,
          query: tabsQuery
        },
        tabCapture: {
          getMediaStreamId
        }
      } as unknown as typeof chrome
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts captures without auto-saving the domain gain and supports multiple sessions", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    let snapshot: CaptureSessionState[] = [];
    const offscreenClient = {
      getSnapshot: vi.fn(async () => snapshot),
      startSession: vi
        .fn()
        .mockImplementationOnce(async () => {
          snapshot = [makeSession(7, "youtube.com", 260)];
          return snapshot;
        })
        .mockImplementationOnce(async () => {
          snapshot = [makeSession(7, "youtube.com", 260), makeSession(9, "twitch.tv", 180)];
          return snapshot;
        }),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };

    tabsGet
      .mockResolvedValueOnce({
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      })
      .mockResolvedValueOnce({
        id: 9,
        title: "Twitch",
        url: "https://twitch.tv/example"
      });
    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);
    getMediaStreamId.mockResolvedValue("stream-id");

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 123);

    const first = (await orchestrator.handlePopupCommand({
      type: "START_CAPTURE",
      payload: { tabId: 7, gainPercent: 260 }
    })) as RuntimeResponse<WorkerState>;
    const second = (await orchestrator.handlePopupCommand({
      type: "START_CAPTURE",
      payload: { tabId: 9, gainPercent: 180 }
    })) as RuntimeResponse<WorkerState>;

    expect(first.ok).toBe(true);
    expect(second.data?.sessions).toHaveLength(2);
    expect(await storage.getDomainGain("youtube.com")).toBeUndefined();
    expect(offscreenClient.startSession).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tabId: 7,
        domain: "youtube.com",
        gainPercent: 260,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      })
    );
    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 7, text: "" });
  });

  it("saves the current gain explicitly when asked to remember a site", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 260)]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };

    tabsGet.mockResolvedValue({
      id: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1"
    });
    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 321);

    await orchestrator.bootstrap();
    const response = (await orchestrator.handlePopupCommand({
      type: "SAVE_DOMAIN_GAIN",
      payload: { tabId: 7, gainPercent: 260 }
    })) as RuntimeResponse<WorkerState>;

    expect(response.ok).toBe(true);
    expect(await storage.getDomainGain("youtube.com")).toBe(260);
  });

  it("removes a remembered site gain when asked to forget it", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    await storage.setDomainGain("youtube.com", 260);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 260)]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };

    tabsGet.mockResolvedValue({
      id: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1"
    });
    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 654);

    await orchestrator.bootstrap();
    const response = (await orchestrator.handlePopupCommand({
      type: "REMOVE_DOMAIN_GAIN",
      payload: { tabId: 7 }
    })) as RuntimeResponse<WorkerState>;

    expect(response.ok).toBe(true);
    expect(await storage.getDomainGain("youtube.com")).toBeUndefined();
  });

  it("keeps the current manual gain when a captured tab navigates to a new domain", async () => {
    const memory = createMemoryStorage();
    const storage = new SettingsRepository(memory.area);
    await storage.setDomainGain("youtube.com", 240);

    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 240)]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn().mockResolvedValue([makeSession(7, "twitch.tv", 240)]),
      closeIfIdle: vi.fn()
    };

    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 500);

    await orchestrator.bootstrap();
    await orchestrator.handleTabUpdated(7, { status: "complete" }, {
      id: 7,
      title: "Twitch",
      url: "https://twitch.tv/live"
    } as chrome.tabs.Tab);

    expect(offscreenClient.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        tabId: 7,
        domain: "twitch.tv",
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      })
    );
    expect(offscreenClient.updateMetadata.mock.calls[0]?.[0]).not.toHaveProperty("gainPercent");
  });

  it("applies advanced settings globally to running sessions", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };

    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 800);

    await orchestrator.bootstrap();
    await orchestrator.handlePopupCommand({
      type: "SET_ADVANCED_AUDIO_SETTINGS",
      payload: applyQualityPreset("maximum_clarity")
    });

    expect(offscreenClient.setAdvancedAudioSettings).toHaveBeenCalledWith(
      applyQualityPreset("maximum_clarity")
    );
    expect((await storage.getAdvancedAudioSettings()).qualityPreset).toBe("maximum_clarity");
  });

  it("persists the quality protector mode and pushes it to active sessions", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };

    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 801);

    await orchestrator.bootstrap();
    await orchestrator.handlePopupCommand({
      type: "SET_ADVANCED_AUDIO_SETTINGS",
      payload: { qualityProtectorMode: "maximum_protection" }
    });

    expect(offscreenClient.setAdvancedAudioSettings).toHaveBeenCalledWith(
      expect.objectContaining({ qualityProtectorMode: "maximum_protection" })
    );
    expect((await storage.getAdvancedAudioSettings()).qualityProtectorMode).toBe("maximum_protection");
  });

  it("closes the offscreen document after the last session stops", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    let snapshot: CaptureSessionState[] = [makeSession(7, "youtube.com", 220)];
    const offscreenClient = {
      getSnapshot: vi.fn().mockImplementation(async () => snapshot),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn().mockImplementation(async () => {
        snapshot = [];
        return snapshot;
      }),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };

    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 900);

    await orchestrator.bootstrap();
    await orchestrator.handlePopupCommand({ type: "STOP_CAPTURE", payload: { tabId: 7 } });

    expect(offscreenClient.closeIfIdle).toHaveBeenCalledWith(0);
    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 7, text: "" });
  });

  it("shows the badge only while audio is active and hides it when audio stops", async () => {
    vi.useFakeTimers();
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };

    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => Date.now());

    await orchestrator.bootstrap();
    actionSetBadgeBackgroundColor.mockClear();
    const orchestratorInternals = orchestrator as unknown as {
      audibleTabs: Map<number, number>;
      badgePulseHighlighted: boolean;
      syncBadgePulseTimer: () => void;
      syncActionBadges: () => Promise<void>;
    };

    orchestratorInternals.audibleTabs.set(7, Number.MAX_SAFE_INTEGER);
    orchestratorInternals.syncBadgePulseTimer();
    orchestratorInternals.badgePulseHighlighted = true;
    await orchestratorInternals.syncActionBadges();

    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 7, text: "🔊" });
    expect(actionSetBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 7, color: "#112638" });

    actionSetBadgeText.mockClear();
    actionSetBadgeBackgroundColor.mockClear();
    orchestratorInternals.audibleTabs.clear();
    orchestratorInternals.badgePulseHighlighted = false;
    await orchestratorInternals.syncActionBadges();

    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 7, text: "" });
    expect(actionSetBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it("stores the current gain as the global auto gain and applies it to every tab when enabling all-sites mode", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };
    const autoBoosterClient = {
      requestGlobalPermission: vi.fn().mockResolvedValue(true),
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue([
        {
          id: 7,
          title: "YouTube",
          url: "https://youtube.com/watch?v=1"
        },
        {
          id: 9,
          title: "Rumble",
          url: "https://rumble.com/example"
        }
      ]),
      configure: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      getDebugState: vi.fn().mockResolvedValue(null)
    };

    tabsGet.mockResolvedValue({
      id: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1"
    });
    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 1000,
      autoBoosterClient as never
    );

    await orchestrator.bootstrap();
    await orchestrator.handlePopupCommand({
      type: "ENABLE_GLOBAL_AUTO_BOOSTER",
      payload: { tabId: 7, gainPercent: 260 }
    });

    expect(await storage.getAutoBoosterMode()).toBe("global");
    expect(await storage.getGlobalAutoGainPercent()).toBe(260);
    expect(autoBoosterClient.configure).toHaveBeenNthCalledWith(
      1,
      7,
      expect.objectContaining({ scope: "global", gainPercent: 260 })
    );
    expect(autoBoosterClient.configure).toHaveBeenNthCalledWith(
      2,
      9,
      expect.objectContaining({ scope: "global", gainPercent: 260 })
    );
  });

  it("propagates gain changes from a global auto tab to every active global auto tab", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([]),
      startSession: vi.fn(),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };
    const tabs = [
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      },
      {
        id: 9,
        title: "Rumble",
        url: "https://rumble.com/example"
      }
    ];
    const autoBoosterClient = {
      requestGlobalPermission: vi.fn().mockResolvedValue(true),
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue(tabs),
      configure: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      getDebugState: vi.fn().mockResolvedValue(null)
    };

    tabsGet.mockImplementation(async (tabId: number) => tabs.find((tab) => tab.id === tabId));
    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 1001,
      autoBoosterClient as never
    );

    await orchestrator.bootstrap();
    await orchestrator.handlePopupCommand({
      type: "ENABLE_GLOBAL_AUTO_BOOSTER",
      payload: { tabId: 7, gainPercent: 220 }
    });

    autoBoosterClient.configure.mockClear();

    await orchestrator.handlePopupCommand({
      type: "SET_GAIN",
      payload: { tabId: 7, gainPercent: 340 }
    });

    expect(await storage.getGlobalAutoGainPercent()).toBe(340);
    expect(autoBoosterClient.configure).toHaveBeenNthCalledWith(
      1,
      7,
      expect.objectContaining({ scope: "global", gainPercent: 340 })
    );
    expect(autoBoosterClient.configure).toHaveBeenNthCalledWith(
      2,
      9,
      expect.objectContaining({ scope: "global", gainPercent: 340 })
    );
  });

  it("switches from global mode to single-tab mode and disables the global auto tabs first", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    let snapshot: CaptureSessionState[] = [];
    const offscreenClient = {
      getSnapshot: vi.fn().mockImplementation(async () => snapshot),
      startSession: vi.fn().mockImplementation(async () => {
        snapshot = [makeSession(7, "youtube.com", 180)];
        return snapshot;
      }),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn(),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };
    const tabs = [
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      },
      {
        id: 9,
        title: "Rumble",
        url: "https://rumble.com/example"
      }
    ];
    const autoBoosterClient = {
      requestGlobalPermission: vi.fn().mockResolvedValue(true),
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue(tabs),
      configure: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      getDebugState: vi.fn().mockResolvedValue(null)
    };

    tabsGet.mockImplementation(async (tabId: number) => tabs.find((tab) => tab.id === tabId));
    getMediaStreamId.mockResolvedValue("stream-id");
    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 1002,
      autoBoosterClient as never
    );

    await orchestrator.bootstrap();
    await orchestrator.handlePopupCommand({
      type: "ENABLE_GLOBAL_AUTO_BOOSTER",
      payload: { tabId: 7, gainPercent: 240 }
    });

    autoBoosterClient.configure.mockClear();
    autoBoosterClient.disable.mockClear();

    const response = (await orchestrator.handlePopupCommand({
      type: "ENABLE_CURRENT_TAB_BOOSTER",
      payload: { tabId: 7, gainPercent: 180 }
    })) as RuntimeResponse<WorkerState>;

    expect(await storage.getAutoBoosterMode()).toBe("off");
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(7);
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(9);
    expect(offscreenClient.startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tabId: 7,
        gainPercent: 180,
        domain: "youtube.com"
      })
    );
    expect(response.data?.autoBoosterMode).toBe("off");
    expect(response.data?.currentTab?.activeLane).toBe("manual_tab_capture");
  });

  it("switches from single-tab mode to global mode and disables site mode first", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    let snapshot: CaptureSessionState[] = [];
    const offscreenClient = {
      getSnapshot: vi.fn().mockImplementation(async () => snapshot),
      startSession: vi.fn().mockImplementation(async () => {
        snapshot = [makeSession(7, "youtube.com", 180)];
        return snapshot;
      }),
      setGain: vi.fn(),
      setAdvancedAudioSettings: vi.fn(),
      stopSession: vi.fn().mockImplementation(async () => {
        snapshot = [];
        return snapshot;
      }),
      stopAll: vi.fn(),
      updateMetadata: vi.fn(),
      closeIfIdle: vi.fn()
    };
    const tabs = [
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      },
      {
        id: 9,
        title: "Rumble",
        url: "https://rumble.com/example"
      }
    ];
    const autoBoosterClient = {
      requestGlobalPermission: vi.fn().mockResolvedValue(true),
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue(tabs),
      configure: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      getDebugState: vi.fn().mockResolvedValue(null)
    };

    tabsGet.mockImplementation(async (tabId: number) => tabs.find((tab) => tab.id === tabId));
    getMediaStreamId.mockResolvedValue("stream-id");
    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 1003,
      autoBoosterClient as never
    );

    await orchestrator.bootstrap();
    const singleTabResponse = (await orchestrator.handlePopupCommand({
      type: "ENABLE_CURRENT_TAB_BOOSTER",
      payload: { tabId: 7, gainPercent: 180 }
    })) as RuntimeResponse<WorkerState>;

    expect(singleTabResponse.data?.currentTab?.activeLane).toBe("manual_tab_capture");

    autoBoosterClient.configure.mockClear();
    autoBoosterClient.disable.mockClear();

    const response = (await orchestrator.handlePopupCommand({
      type: "ENABLE_GLOBAL_AUTO_BOOSTER",
      payload: { tabId: 7, gainPercent: 260 }
    })) as RuntimeResponse<WorkerState>;

    expect(offscreenClient.stopSession).toHaveBeenCalledWith(7);
    expect(await storage.getAutoBoosterMode()).toBe("global");
    expect(autoBoosterClient.configure).toHaveBeenNthCalledWith(
      1,
      7,
      expect.objectContaining({ scope: "global", gainPercent: 260 })
    );
    expect(autoBoosterClient.configure).toHaveBeenNthCalledWith(
      2,
      9,
      expect.objectContaining({ scope: "global", gainPercent: 260 })
    );
    expect(response.data?.autoBoosterMode).toBe("global");
    expect(response.data?.currentTab?.autoBoosterScope).toBe("global");
  });
});
