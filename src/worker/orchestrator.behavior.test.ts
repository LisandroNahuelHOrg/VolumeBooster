import { DEFAULT_ADVANCED_AUDIO_SETTINGS, applyQualityPreset } from "../shared/audio-settings";
import { SettingsRepository } from "../shared/storage";
import type {
  AutoSessionAttachFailedPayload,
  AutoSessionLevelPayload,
  AutoSessionStatusPayload,
  CaptureSessionState,
  RuntimeResponse,
  SessionStatusPayload,
  WorkerState
} from "../shared/types";
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

function makeAutoStatus(
  overrides: Partial<AutoSessionStatusPayload> = {}
): AutoSessionStatusPayload {
  return {
    tabId: 7,
    title: "YouTube",
    url: "https://youtube.com/watch?v=1",
    domain: "youtube.com",
    favIconUrl: "https://youtube.com/icon.ico",
    autoAttachState: "attached",
    autoAttachReason: undefined,
    autoBoosterScope: "global",
    gainPercent: 240,
    engineLane: "auto_media_element",
    streamState: "active",
    engineStatus: "ready",
    ...overrides
  };
}

function makeLevelUpdate(overrides: Partial<AutoSessionLevelPayload> = {}): AutoSessionLevelPayload {
  return {
    tabId: 7,
    level: 0.6,
    warning: "high",
    protectorActionDb: 4.5,
    clipEvents: 2,
    clipPeak: 0.9,
    protectionBypassed: false,
    outputPeak: 0.61,
    ...overrides
  };
}

describe("WorkerOrchestrator worker flows", () => {
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
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("turns global mode off during bootstrap when host permission is missing", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    await storage.setAutoBoosterMode("global");
    const setAutoBoosterModeSpy = vi.spyOn(storage, "setAutoBoosterMode");
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([]),
      closeIfIdle: vi.fn()
    };
    const autoBoosterClient = {
      hasGlobalPermission: vi.fn().mockResolvedValue(false),
      queryInjectableTabs: vi.fn()
    };
    tabsQuery.mockResolvedValue([]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 1,
      autoBoosterClient as never
    );

    await orchestrator.bootstrap();

    expect(await storage.getAutoBoosterMode()).toBe("off");
    expect(setAutoBoosterModeSpy).toHaveBeenCalledWith("off");
    expect(autoBoosterClient.queryInjectableTabs).not.toHaveBeenCalled();
  });

  it("syncs global tabs during bootstrap when global mode is persisted and permission is available", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    await storage.setAutoBoosterMode("global");
    await storage.setGlobalAutoGainPercent(280);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([]),
      closeIfIdle: vi.fn()
    };
    const autoBoosterClient = {
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue([
        { id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }
      ]),
      configure: vi.fn().mockResolvedValue(undefined)
    };
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 1,
      autoBoosterClient as never
    );

    await orchestrator.bootstrap();

    expect(autoBoosterClient.queryInjectableTabs).toHaveBeenCalledTimes(1);
    expect(autoBoosterClient.configure).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        scope: "global",
        gainPercent: 280,
        enabled: true,
        suspended: false
      })
    );
  });

  it("surfaces permission errors for site and global requests", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const orchestrator = new WorkerOrchestrator(
      {
        getSnapshot: vi.fn().mockResolvedValue([])
      } as never,
      storage,
      () => 2,
      {
        requestGlobalPermission: vi.fn().mockResolvedValue(false)
      } as never
    );

    tabsGet.mockResolvedValue({
      id: 7,
      title: "Chrome",
      url: "chrome://extensions"
    });
    tabsQuery.mockResolvedValue([]);

    const siteResponse = (await orchestrator.handlePopupCommand({
      type: "REQUEST_SITE_PERMISSION",
      payload: { tabId: 7 }
    })) as RuntimeResponse<WorkerState>;
    const globalResponse = (await orchestrator.handlePopupCommand({
      type: "REQUEST_GLOBAL_PERMISSION"
    })) as RuntimeResponse<WorkerState>;

    expect(siteResponse).toMatchObject({
      ok: false,
      errorMessage: { key: "errorTabNotCapturable" }
    });
    expect(globalResponse).toMatchObject({
      ok: false,
      errorMessage: { key: "errorAutoGlobalPermissionDenied" }
    });
  });

  it("returns state successfully when global permission is granted", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const orchestrator = new WorkerOrchestrator(
      {
        getSnapshot: vi.fn().mockResolvedValue([])
      } as never,
      storage,
      () => 2,
      {
        requestGlobalPermission: vi.fn().mockResolvedValue(true)
      } as never
    );

    tabsQuery.mockResolvedValue([]);

    const response = (await orchestrator.handlePopupCommand({
      type: "REQUEST_GLOBAL_PERMISSION"
    })) as RuntimeResponse<WorkerState>;

    expect(response).toMatchObject({
      ok: true,
      data: {
        autoBoosterMode: "off",
        sessions: []
      }
    });
  });

  it("returns debug state from cached auto tab runtime when the content script has no live snapshot", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const orchestrator = new WorkerOrchestrator(
      {
        getSnapshot: vi.fn().mockResolvedValue([])
      } as never,
      storage,
      () => 3,
      {
        getDebugState: vi.fn().mockResolvedValue(null)
      } as never
    );

    tabsQuery.mockResolvedValue([]);
    await orchestrator.handleBackgroundEvent({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload: makeAutoStatus({ autoAttachState: "awaiting_user_gesture", autoAttachReason: "autoplay_blocked" })
    });

    const response = await orchestrator.handlePopupCommand({
      type: "GET_DEBUG_STATE",
      payload: { tabId: 7 }
    });

    expect(response).toMatchObject({
      ok: true,
      data: {
        lane: "auto_media_element",
        enabled: true,
        attachState: "awaiting_user_gesture",
        attachReason: "autoplay_blocked",
        currentUrl: "https://youtube.com/watch?v=1"
      }
    });
  });

  it("returns the live debug state directly when the content script has one", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const liveState = {
      tabId: 17,
      lane: "auto_media_element" as const,
      enabled: true,
      suspended: false,
      scope: "global" as const,
      attachState: "attached" as const,
      attachReason: undefined,
      audioContextState: "running",
      autoplayPolicy: "allowed",
      mediaElementCount: 2,
      attachedElementCount: 2,
      lastTelemetryAt: 111,
      lastLevel: 0.66,
      lastError: undefined,
      lastTechnicalError: undefined,
      currentUrl: "https://youtube.com/watch?v=1"
    };
    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 4,
      {
        getDebugState: vi.fn().mockResolvedValue(liveState)
      } as never
    );

    tabsQuery.mockResolvedValue([]);

    const response = await orchestrator.handlePopupCommand({
      type: "GET_DEBUG_STATE",
      payload: { tabId: 17 }
    });

    expect(response).toEqual({ ok: true, data: liveState });
  });

  it("returns null debug state when there is no live snapshot and no cached auto tab state", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 5,
      {
        getDebugState: vi.fn().mockRejectedValue(new Error("sleeping"))
      } as never
    );

    tabsQuery.mockResolvedValue([]);

    const response = await orchestrator.handlePopupCommand({
      type: "GET_DEBUG_STATE",
      payload: { tabId: 99 }
    });

    expect(response).toEqual({ ok: true, data: null });
  });

  it("returns advanced audio settings through the GET_ADVANCED_AUDIO_SETTINGS alias", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    await storage.setAdvancedAudioSettings(
      applyQualityPreset("maximum_loudness")
    );
    tabsQuery.mockResolvedValue([]);
    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 6
    );

    const response = (await orchestrator.handlePopupCommand({
      type: "GET_ADVANCED_AUDIO_SETTINGS"
    })) as RuntimeResponse<WorkerState>;

    expect(response.ok).toBe(true);
    expect(response.data?.advancedAudioSettings).toEqual(
      expect.objectContaining({
        qualityPreset: "maximum_loudness"
      })
    );
  });

  it("updates manual sessions from offscreen events and capture status changes", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 10
    );
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);
    (orchestrator as unknown as {
      replaceManualSessions: (sessions: CaptureSessionState[]) => void;
    }).replaceManualSessions([makeSession(7, "youtube.com", 220)]);

    await (orchestrator as unknown as {
      handleOffscreenEvent: (message: unknown) => Promise<void>;
    }).handleOffscreenEvent({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 7,
        level: 0.7,
        warning: "danger",
        protectorActionDb: 8.4,
        clipEvents: 3,
        clipPeak: 1.2,
        protectionBypassed: false,
        outputPeak: 0.88
      }
    });
    await orchestrator.handleCaptureStatusChanged({ tabId: 7, status: "stopped" } as chrome.tabCapture.CaptureInfo);

    const sessions = (orchestrator as unknown as { sessions: Map<number, CaptureSessionState> }).sessions;
    const state = sessions.get(7);

    expect(state).toMatchObject({
      level: 0.7,
      warning: "danger",
      clipEvents: 3,
      streamState: "inactive",
      lastError: { key: "errorCaptureStopped" }
    });
  });

  it("updates auto sessions from content events and clears them on failure", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 20
    );
    tabsQuery.mockResolvedValue([
      { id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }
    ]);

    await orchestrator.handleBackgroundEvent({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload: makeAutoStatus()
    });
    await orchestrator.handleBackgroundEvent({
      type: "AUTO_SESSION_LEVEL_UPDATE",
      payload: makeLevelUpdate()
    });

    let state = (await orchestrator.handlePopupCommand({ type: "GET_STATE" })) as RuntimeResponse<WorkerState>;
    expect(state.data?.sessions[0]).toMatchObject({
      engineLane: "auto_media_element",
      level: 0.6,
      clipEvents: 2
    });

    const failurePayload: AutoSessionAttachFailedPayload = {
      ...makeAutoStatus({
        autoAttachState: "failed",
        streamState: "error",
        engineStatus: "error"
      }),
      lastError: { key: "errorAutoAttachFailed" }
    };
    await orchestrator.handleBackgroundEvent({
      type: "AUTO_SESSION_ATTACH_FAILED",
      payload: failurePayload
    });

    state = (await orchestrator.handlePopupCommand({ type: "GET_STATE" })) as RuntimeResponse<WorkerState>;
    expect(state.data?.sessions).toEqual([]);
    expect(state.data?.currentTab?.autoAttachState).toBe("failed");
  });

  it("broadcasts worker state with the exact runtime message contract and current-tab query", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(33, "youtube.com", 240)])
    };
    tabsQuery.mockResolvedValue([
      {
        id: 33,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      }
    ]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 77);
    await orchestrator.bootstrap();
    runtimeSendMessage.mockClear();
    tabsQuery.mockClear();

    await (orchestrator as unknown as {
      handleOffscreenEvent(message: unknown): Promise<void>;
    }).handleOffscreenEvent({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 33,
        streamState: "active",
        engineStatus: "ready",
        gainPercent: 240
      }
    });

    expect(tabsQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "WORKER_STATE_UPDATE",
      payload: expect.objectContaining({
        currentTab: expect.objectContaining({
          tabId: 33,
          title: "YouTube"
        }),
        generatedAt: 77
      })
    });
  });

  it("stops a manual capture when a captured tab navigates to an unsupported url", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      stopSession: vi.fn().mockResolvedValue([]),
      closeIfIdle: vi.fn()
    };
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 30);
    await orchestrator.bootstrap();

    await orchestrator.handleTabUpdated(
      7,
      { url: "chrome://extensions" },
      { id: 7, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab
    );

    expect(offscreenClient.stopSession).toHaveBeenCalledWith(7);
    expect(offscreenClient.closeIfIdle).toHaveBeenCalledWith(0);
  });

  it("reapplies stored gain and metadata when a captured tab changes domain", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    await storage.setDomainGain("rumble.com", 260);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      updateMetadata: vi.fn().mockResolvedValue([makeSession(7, "rumble.com", 260)])
    };
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);

    const orchestrator = new WorkerOrchestrator(offscreenClient as never, storage, () => 40);
    await orchestrator.bootstrap();

    await orchestrator.handleTabUpdated(
      7,
      { status: "complete" },
      { id: 7, title: "Rumble", url: "https://rumble.com/v/test" } as chrome.tabs.Tab
    );

    expect(offscreenClient.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        tabId: 7,
        domain: "rumble.com",
        gainPercent: 260
      })
    );
  });

  it("activates global auto mode on tab updates and activations", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    await storage.setAutoBoosterMode("global");
    await storage.setGlobalAutoGainPercent(300);
    const autoBoosterClient = {
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue([]),
      configure: vi.fn().mockResolvedValue(undefined)
    };
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);
    tabsGet.mockResolvedValue({ id: 9, title: "Rumble", url: "https://rumble.com/v/demo" });

    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 50,
      autoBoosterClient as never
    );
    await orchestrator.bootstrap();

    await orchestrator.handleTabUpdated(
      9,
      { status: "complete" },
      { id: 9, title: "Rumble", url: "https://rumble.com/v/demo" } as chrome.tabs.Tab
    );
    await orchestrator.handleTabActivated({ tabId: 9 });

    expect(autoBoosterClient.configure).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        scope: "global",
        gainPercent: 300
      })
    );
  });

  it("does not try to auto-attach global mode when a tab update lacks a tab id", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    await storage.setAutoBoosterMode("global");
    const autoBoosterClient = {
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue([]),
      configure: vi.fn().mockResolvedValue(undefined)
    };
    tabsQuery.mockResolvedValue([]);

    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 50,
      autoBoosterClient as never
    );
    await orchestrator.bootstrap();

    await expect(
      orchestrator.handleTabUpdated(
        0,
        { status: "complete" },
        { title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab
      )
    ).resolves.toBeUndefined();

    expect(autoBoosterClient.configure).not.toHaveBeenCalled();
  });

  it("does not auto-attach on tab updates or activations unless global mode is active and the tab is supported", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const autoBoosterClient = {
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue([]),
      configure: vi.fn().mockResolvedValue(undefined)
    };
    tabsQuery.mockResolvedValue([]);
    tabsGet.mockResolvedValue({ id: 18, title: "Chrome", url: "chrome://extensions" });

    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 51,
      autoBoosterClient as never
    );

    await orchestrator.handleTabUpdated(
      18,
      { status: "complete" },
      { id: 18, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab
    );
    await orchestrator.handleTabActivated({ tabId: 18 });

    expect(autoBoosterClient.configure).not.toHaveBeenCalled();

    await storage.setAutoBoosterMode("global");
    const globalOrchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 52,
      autoBoosterClient as never
    );
    await globalOrchestrator.bootstrap();

    autoBoosterClient.configure.mockClear();
    await globalOrchestrator.handleTabUpdated(
      18,
      { status: "loading" },
      { id: 18, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab
    );
    await globalOrchestrator.handleTabActivated({ tabId: 18 });

    expect(autoBoosterClient.configure).not.toHaveBeenCalled();
  });

  it("cleans auto state when tabs are removed and when global mode is disabled", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const setAutoBoosterModeSpy = vi.spyOn(storage, "setAutoBoosterMode");
    const autoBoosterClient = {
      requestGlobalPermission: vi.fn().mockResolvedValue(true),
      hasGlobalPermission: vi.fn().mockResolvedValue(true),
      queryInjectableTabs: vi.fn().mockResolvedValue([
        { id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" },
        { id: 9, title: "Rumble", url: "https://rumble.com/demo" }
      ]),
      configure: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      getDebugState: vi.fn().mockResolvedValue(null)
    };
    tabsGet.mockResolvedValue({ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" });
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);

    const orchestrator = new WorkerOrchestrator(
      { getSnapshot: vi.fn().mockResolvedValue([]) } as never,
      storage,
      () => 60,
      autoBoosterClient as never
    );

    await orchestrator.bootstrap();
    await orchestrator.handlePopupCommand({
      type: "ENABLE_GLOBAL_AUTO_BOOSTER",
      payload: { tabId: 7, gainPercent: 220 }
    });
    await orchestrator.handleTabRemoved(9);
    await orchestrator.handlePopupCommand({ type: "DISABLE_GLOBAL_AUTO_BOOSTER" });

    expect(autoBoosterClient.disable).toHaveBeenCalledWith(7);
    expect(await storage.getAutoBoosterMode()).toBe("off");
    expect(setAutoBoosterModeSpy).toHaveBeenCalledWith("off");
  });

  it("disables the current tab booster through its dedicated popup command", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    let snapshot: CaptureSessionState[] = [makeSession(7, "youtube.com", 220)];
    const offscreenClient = {
      getSnapshot: vi.fn().mockImplementation(async () => snapshot),
      stopSession: vi.fn().mockImplementation(async () => {
        snapshot = [];
        return snapshot;
      }),
      closeIfIdle: vi.fn().mockResolvedValue(undefined)
    };
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 61
    );

    await orchestrator.bootstrap();

    const response = await orchestrator.handlePopupCommand({
      type: "DISABLE_CURRENT_TAB_BOOSTER",
      payload: { tabId: 7 }
    });

    expect(response).toMatchObject({ ok: true });
    expect(offscreenClient.stopSession).toHaveBeenCalledWith(7);
    expect(offscreenClient.closeIfIdle).toHaveBeenCalledWith(0);
  });

  it("stops every running booster through the STOP_ALL popup command", async () => {
    const storage = new SettingsRepository(createMemoryStorage().area);
    const offscreenClient = {
      getSnapshot: vi.fn().mockResolvedValue([makeSession(7, "youtube.com", 220)]),
      stopAll: vi.fn().mockResolvedValue([]),
      closeIfIdle: vi.fn().mockResolvedValue(undefined)
    };
    tabsQuery.mockResolvedValue([{ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" }]);

    const orchestrator = new WorkerOrchestrator(
      offscreenClient as never,
      storage,
      () => 62
    );

    await orchestrator.bootstrap();

    const response = await orchestrator.handlePopupCommand({ type: "STOP_ALL" });

    expect(response).toMatchObject({ ok: true });
    expect(offscreenClient.stopAll).toHaveBeenCalledTimes(1);
    expect(offscreenClient.closeIfIdle).toHaveBeenCalledWith(0);
  });
});
