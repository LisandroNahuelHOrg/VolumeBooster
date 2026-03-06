import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { message } from "../shared/messages";
import { SettingsRepository } from "../shared/storage";
import type {
  AdvancedAudioSettings,
  AutoBoosterMode,
  AutoBoosterScope,
  AutoBoosterTabState,
  AutoSessionAttachFailedPayload,
  AutoSessionLevelPayload,
  AutoSessionStatusPayload,
  CaptureSessionState,
  LocalizedMessage,
  SessionStatusPayload
} from "../shared/types";
import { WorkerOrchestrator } from "./orchestrator";

interface AutoTabRuntimeState extends AutoBoosterTabState {
  gainPercent: number;
  lastError?: LocalizedMessage;
}

interface WorkerOrchestratorInternals {
  sessions: Map<number, CaptureSessionState>;
  manualSessions: Map<number, CaptureSessionState>;
  autoSessions: Map<number, CaptureSessionState>;
  autoTabStates: Map<number, AutoTabRuntimeState>;
  siteEnabledAutoTabs: Set<number>;
  autoSuppressedTabs: Set<number>;
  audibleTabs: Map<number, number>;
  badgedTabs: Set<number>;
  badgePulseTimer: ReturnType<typeof globalThis.setInterval> | null;
  badgePulseHighlighted: boolean;
  autoBoosterMode: AutoBoosterMode;
  syncFromOffscreen(): Promise<void>;
  setGain(tabId: number, gainPercent: number): Promise<void>;
  stopCapture(tabId: number): Promise<void>;
  stopAll(): Promise<void>;
  applyManualStatusUpdate(update: SessionStatusPayload): void;
  applyAutoStatusUpdate(update: AutoSessionStatusPayload): void;
  applyAutoLevelUpdate(update: AutoSessionLevelPayload): void;
  applyAutoAttachFailure(update: AutoSessionAttachFailedPayload): void;
  normalizeManualSession(session: CaptureSessionState): CaptureSessionState;
  createEmptyAutoSession(update: AutoSessionStatusPayload): CaptureSessionState;
  deactivateGlobalAutoBooster(): Promise<void>;
  syncGlobalAutoBoosterAcrossTabs(): Promise<void>;
  syncConfiguredAutoTabs(settings?: AdvancedAudioSettings): Promise<void>;
  activateAutoBoosterForTab(
    tab: chrome.tabs.Tab,
    scope: AutoBoosterScope,
    gainOverride?: number,
    settingsOverride?: AdvancedAudioSettings
  ): Promise<void>;
  pauseAutoLaneForManual(tabId: number): Promise<void>;
  resumeAutoLaneIfNeeded(tabId: number): Promise<void>;
  stopAutoForTab(tabId: number): Promise<void>;
  disableAllSiteAutoTabs(): Promise<void>;
  syncGlobalAutoBoosterGain(gainPercent: number): Promise<void>;
  validateTabForAutoBooster(tabId: number): Promise<chrome.tabs.Tab>;
  markAutoUnsupported(tab: chrome.tabs.Tab, scope: AutoBoosterScope): void;
  resetNavigationScopedAutoState(tabId: number): void;
  getAutoScopeForTab(tabId: number): AutoBoosterScope | undefined;
  shouldAutoRemainEnabled(tabId: number): boolean;
  toErrorMessage(error: unknown): LocalizedMessage;
  syncActionBadges(): Promise<void>;
  updateAudibleState(tabId: number, level: number): boolean;
  isTabAudible(tabId: number): boolean;
  pruneAudibleTabs(): void;
  syncBadgePulseTimer(): void;
  stopBadgePulseTimer(): void;
}

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

function makeSession(
  tabId: number,
  domain: string,
  gainPercent: number,
  overrides: Partial<CaptureSessionState> = {}
): CaptureSessionState {
  return {
    tabId,
    title: `Tab ${tabId}`,
    url: `https://${domain}/video`,
    domain,
    favIconUrl: `https://${domain}/favicon.ico`,
    gainPercent,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.3,
    warning: "none",
    protectorActionDb: 4.1,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.52,
    updatedAt: 1,
    ...overrides
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
    favIconUrl: "https://youtube.com/favicon.ico",
    autoAttachState: "attached",
    autoAttachReason: undefined,
    autoBoosterScope: "global",
    gainPercent: 220,
    engineLane: "auto_media_element",
    streamState: "active",
    engineStatus: "ready",
    ...overrides
  };
}

function makeLevelUpdate(overrides: Partial<AutoSessionLevelPayload> = {}): AutoSessionLevelPayload {
  return {
    tabId: 7,
    level: 0.45,
    warning: "high",
    protectorActionDb: 7.5,
    clipEvents: 2,
    clipPeak: 1.1,
    protectionBypassed: false,
    outputPeak: 0.78,
    ...overrides
  };
}

function createHarness() {
  const storage = new SettingsRepository(createMemoryStorage().area);
  const offscreenClient = {
    getSnapshot: vi.fn(async () => [] as CaptureSessionState[]),
    startSession: vi.fn(async () => [] as CaptureSessionState[]),
    setGain: vi.fn(async () => [] as CaptureSessionState[]),
    setAdvancedAudioSettings: vi.fn(async () => [] as CaptureSessionState[]),
    stopSession: vi.fn(async () => [] as CaptureSessionState[]),
    stopAll: vi.fn(async () => [] as CaptureSessionState[]),
    updateMetadata: vi.fn(async () => [] as CaptureSessionState[]),
    closeIfIdle: vi.fn(async () => undefined)
  };
  const autoBoosterClient = {
    requestGlobalPermission: vi.fn(async () => true),
    hasGlobalPermission: vi.fn(async () => true),
    queryInjectableTabs: vi.fn(async () => [] as chrome.tabs.Tab[]),
    configure: vi.fn(async () => undefined),
    disable: vi.fn(async () => undefined),
    getDebugState: vi.fn(async () => null)
  };

  const orchestrator = new WorkerOrchestrator(
    offscreenClient as never,
    storage,
    () => Date.now(),
    autoBoosterClient as never
  );

  return {
    storage,
    offscreenClient,
    autoBoosterClient,
    orchestrator,
    internals: orchestrator as unknown as WorkerOrchestratorInternals
  };
}

describe("WorkerOrchestrator internals", () => {
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

    tabsQuery.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("covers syncFromOffscreen, setGain branches, save/remove errors, and stopCapture variants", async () => {
    const { orchestrator, internals, offscreenClient, storage } = createHarness();
    offscreenClient.getSnapshot.mockResolvedValue([]);
    offscreenClient.setGain.mockResolvedValue([makeSession(7, "youtube.com", 340)]);
    tabsGet.mockResolvedValue({ id: 7, title: "YouTube", url: "https://youtube.com/watch?v=1" });

    internals.manualSessions.set(7, makeSession(7, "youtube.com", 220));
    internals.siteEnabledAutoTabs.add(7);

    const activateSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = activateSpy;

    await internals.syncFromOffscreen();
    expect(internals.manualSessions.get(7)?.gainPercent).toBe(220);

    await internals.setGain(7, 340);
    expect(offscreenClient.setGain).toHaveBeenCalledWith(7, 340);
    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      "site",
      340
    );

    internals.manualSessions.clear();
    internals.siteEnabledAutoTabs.clear();
    internals.autoBoosterMode = "global";
    const globalSyncSpy = vi.fn(async () => undefined);
    internals.syncGlobalAutoBoosterGain = globalSyncSpy;
    await internals.setGain(7, 410);
    expect(await storage.getGlobalAutoGainPercent()).toBe(410);
    expect(globalSyncSpy).toHaveBeenCalledWith(410);

    tabsGet.mockResolvedValue({ id: 7, title: "Chrome", url: "chrome://extensions" });
    await expect(
      orchestrator.handlePopupCommand({
        type: "SAVE_DOMAIN_GAIN",
        payload: { tabId: 7, gainPercent: 200 }
      })
    ).resolves.toMatchObject({ ok: false, errorMessage: { key: "errorRememberUnavailable" } });
    await expect(
      orchestrator.handlePopupCommand({
        type: "REMOVE_DOMAIN_GAIN",
        payload: { tabId: 7 }
      })
    ).resolves.toMatchObject({ ok: false, errorMessage: { key: "errorForgetUnavailable" } });

    const stopAutoSpy = vi.fn(async () => undefined);
    internals.stopAutoForTab = stopAutoSpy;
    internals.autoTabStates.set(9, {
      tabId: 9,
      title: "Rumble",
      url: "https://rumble.com/demo",
      domain: "rumble.com",
      favIconUrl: "https://rumble.com/favicon.ico",
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      autoBoosterScope: "site",
      gainPercent: 180
    });
    await internals.stopCapture(9);
    expect(stopAutoSpy).toHaveBeenCalledWith(9);

    stopAutoSpy.mockClear();
    await internals.stopCapture(11);
    expect(stopAutoSpy).not.toHaveBeenCalled();
  });

  it("covers stopAll plus manual and auto status update branches", async () => {
    const { internals, offscreenClient } = createHarness();
    offscreenClient.stopAll.mockResolvedValue([]);
    offscreenClient.closeIfIdle.mockResolvedValue(undefined);

    internals.manualSessions.set(7, makeSession(7, "youtube.com", 220));
    internals.autoSessions.set(
      9,
      makeSession(9, "rumble.com", 180, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "site"
      })
    );
    internals.autoTabStates.set(10, {
      tabId: 10,
      title: "Kick",
      url: "https://kick.com/demo",
      domain: "kick.com",
      favIconUrl: "https://kick.com/favicon.ico",
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      autoBoosterScope: "site",
      gainPercent: 160
    });
    internals.siteEnabledAutoTabs.add(11);
    const stopAutoSpy = vi.fn(async (tabId: number) => {
      internals.autoSessions.delete(tabId);
      internals.autoTabStates.delete(tabId);
      internals.siteEnabledAutoTabs.delete(tabId);
    });
    internals.stopAutoForTab = stopAutoSpy;

    await internals.stopAll();
    expect(offscreenClient.stopAll).toHaveBeenCalled();
    expect(offscreenClient.closeIfIdle).toHaveBeenCalledWith(0);
    expect(stopAutoSpy).toHaveBeenCalledTimes(3);

    internals.applyManualStatusUpdate({
      tabId: 77,
      streamState: "active",
      engineStatus: "ready",
      gainPercent: 100
    });

    internals.manualSessions.set(7, makeSession(7, "youtube.com", 220));
    internals.audibleTabs.set(7, Date.now() + 5_000);
    internals.applyManualStatusUpdate({
      tabId: 7,
      streamState: "active",
      engineStatus: "ready",
      gainPercent: 310
    });
    expect(internals.manualSessions.get(7)?.gainPercent).toBe(310);
    expect(internals.audibleTabs.has(7)).toBe(true);

    internals.applyAutoStatusUpdate(
      makeAutoStatus({ autoAttachState: "failed", streamState: "inactive", tabId: 7 })
    );
    expect(internals.autoSessions.has(7)).toBe(false);

    internals.applyAutoLevelUpdate({ ...makeLevelUpdate(), tabId: 70 });
    expect(internals.autoSessions.has(70)).toBe(false);

    internals.applyAutoAttachFailure({
      ...makeAutoStatus({
        tabId: 12,
        autoAttachState: "failed",
        autoAttachReason: "attach_failed",
        streamState: "error",
        engineStatus: "error"
      }),
      lastError: message("errorAutoAttachFailed")
    });
    expect(internals.autoTabStates.get(12)?.autoAttachState).toBe("failed");
  });

  it("covers deactivate and sync flows for auto-booster tabs", async () => {
    const { internals, autoBoosterClient } = createHarness();
    internals.autoBoosterMode = "global";
    internals.autoSuppressedTabs.add(30);
    internals.autoTabStates.set(7, {
      tabId: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "attached",
      autoBoosterScope: "global",
      gainPercent: 220
    });
    internals.autoSessions.set(
      9,
      makeSession(9, "rumble.com", 180, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "global"
      })
    );

    await internals.deactivateGlobalAutoBooster();
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(7);
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(9);
    expect(internals.autoBoosterMode).toBe("off");

    const activateSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = activateSpy;
    autoBoosterClient.queryInjectableTabs.mockResolvedValue([
      { id: 30, url: "https://youtube.com/watch?v=skip" } as chrome.tabs.Tab,
      { id: 31, url: "chrome://extensions" } as chrome.tabs.Tab,
      { id: 32, url: "https://rumble.com/demo" } as chrome.tabs.Tab
    ]);
    internals.autoBoosterMode = "global";
    internals.autoSuppressedTabs.add(30);
    await internals.syncGlobalAutoBoosterAcrossTabs();
    expect(activateSpy).toHaveBeenCalledTimes(1);
    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 32 }),
      "global"
    );

    activateSpy.mockClear();
    tabsGet.mockImplementation(async (tabId: number) =>
      tabId === 40
        ? ({ id: 40, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab)
        : tabId === 41
          ? ({ id: 41, title: "Rumble", url: "https://rumble.com/demo" } as chrome.tabs.Tab)
          : ({ id: 42, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab)
    );
    internals.siteEnabledAutoTabs.add(40);
    internals.autoSuppressedTabs.delete(41);
    autoBoosterClient.queryInjectableTabs.mockResolvedValue([
      { id: 41, title: "Rumble", url: "https://rumble.com/demo" } as chrome.tabs.Tab,
      { id: 42, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab
    ]);
    await internals.syncConfiguredAutoTabs(DEFAULT_ADVANCED_AUDIO_SETTINGS);
    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 40 }),
      "site",
      undefined,
      DEFAULT_ADVANCED_AUDIO_SETTINGS
    );
    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 41 }),
      "global",
      undefined,
      DEFAULT_ADVANCED_AUDIO_SETTINGS
    );

    activateSpy.mockClear();
    tabsGet.mockResolvedValueOnce(null);
    tabsGet.mockResolvedValueOnce({ id: 43, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab);
    internals.siteEnabledAutoTabs.clear();
    internals.siteEnabledAutoTabs.add(43);
    autoBoosterClient.queryInjectableTabs.mockResolvedValue([]);
    await internals.syncConfiguredAutoTabs(DEFAULT_ADVANCED_AUDIO_SETTINGS);
    expect(activateSpy).not.toHaveBeenCalled();
  });

  it("covers activation, pause/resume and site/global stop branches", async () => {
    const { internals, offscreenClient, autoBoosterClient, storage } = createHarness();
    await storage.setDomainGain("youtube.com", 260);
    await storage.setGlobalAutoGainPercent(340);

    await expect(
      internals.activateAutoBoosterForTab({ title: "Missing" } as chrome.tabs.Tab, "site")
    ).rejects.toMatchObject({ key: "errorTabNoLongerExists" });
    await expect(
      internals.activateAutoBoosterForTab({ id: 7, url: "chrome://extensions" } as chrome.tabs.Tab, "site")
    ).rejects.toMatchObject({ key: "errorTabNotCapturable" });

    internals.markAutoUnsupported = vi.fn();
    await internals.activateAutoBoosterForTab(
      { id: 8, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab,
      "global"
    );
    expect(internals.markAutoUnsupported).toHaveBeenCalledWith(
      expect.objectContaining({ id: 8 }),
      "global"
    );

    await internals.activateAutoBoosterForTab(
      {
        id: 9,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        favIconUrl: "https://youtube.com/favicon.ico"
      } as chrome.tabs.Tab,
      "site"
    );
    expect(autoBoosterClient.configure).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        scope: "site",
        gainPercent: 260,
        advancedAudioSettings: DEFAULT_ADVANCED_AUDIO_SETTINGS
      })
    );

    autoBoosterClient.configure.mockRejectedValueOnce(message("errorAutoPermissionMissing"));
    await internals.activateAutoBoosterForTab(
      { id: 10, title: "Kick", url: "https://kick.com/demo" } as chrome.tabs.Tab,
      "global"
    );
    expect(internals.autoTabStates.get(10)).toMatchObject({
      autoAttachState: "unsupported",
      autoAttachReason: "permission_missing"
    });

    autoBoosterClient.configure.mockRejectedValueOnce(new Error("broken"));
    await expect(
      internals.activateAutoBoosterForTab(
        { id: 11, title: "Kick", url: "https://kick.com/demo" } as chrome.tabs.Tab,
        "site"
      )
    ).rejects.toMatchObject({ key: "errorExtensionActionFailed" });

    tabsGet.mockResolvedValue({ id: 9, title: "YouTube", url: "https://youtube.com/watch?v=1" });
    internals.autoSessions.set(
      9,
      makeSession(9, "youtube.com", 280, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "site"
      })
    );
    internals.siteEnabledAutoTabs.add(9);
    await internals.pauseAutoLaneForManual(9);
    expect(autoBoosterClient.configure).toHaveBeenLastCalledWith(
      9,
      expect.objectContaining({
        scope: "site",
        suspended: true,
        gainPercent: 280
      })
    );

    tabsGet.mockResolvedValue({ id: 9, title: "Chrome", url: "chrome://extensions" });
    await internals.pauseAutoLaneForManual(9);
    expect(autoBoosterClient.configure).toHaveBeenCalledTimes(4);

    const resumeSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = resumeSpy;
    internals.autoSuppressedTabs.clear();
    tabsGet.mockResolvedValue({ id: 9, title: "YouTube", url: "https://youtube.com/watch?v=1" });
    await internals.resumeAutoLaneIfNeeded(9);
    expect(resumeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9 }),
      "site"
    );
    internals.autoSuppressedTabs.add(9);
    await internals.resumeAutoLaneIfNeeded(9);
    expect(resumeSpy).toHaveBeenCalledTimes(1);

    tabsGet.mockResolvedValueOnce(null);
    await internals.resumeAutoLaneIfNeeded(9);
    tabsGet.mockResolvedValueOnce({ id: 9, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab);
    await internals.resumeAutoLaneIfNeeded(9);
    expect(resumeSpy).toHaveBeenCalledTimes(1);

    internals.autoSuppressedTabs.clear();
    await internals.stopAutoForTab(9);
    expect(internals.siteEnabledAutoTabs.has(9)).toBe(false);

    internals.autoTabStates.set(12, {
      tabId: 12,
      title: "Rumble",
      url: "https://rumble.com/demo",
      domain: "rumble.com",
      favIconUrl: "https://rumble.com/favicon.ico",
      autoAttachState: "attached",
      autoBoosterScope: "global",
      gainPercent: 210
    });
    await internals.stopAutoForTab(12);
    expect(internals.autoSuppressedTabs.has(12)).toBe(true);

    internals.autoSessions.set(
      13,
      makeSession(13, "youtube.com", 220, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "site"
      })
    );
    internals.autoTabStates.set(14, {
      tabId: 14,
      title: "Rumble",
      url: "https://rumble.com/demo",
      domain: "rumble.com",
      favIconUrl: "https://rumble.com/favicon.ico",
      autoAttachState: "attached",
      autoBoosterScope: "site",
      gainPercent: 220
    });
    internals.siteEnabledAutoTabs.add(15);
    await internals.disableAllSiteAutoTabs();
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(13);
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(14);
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(15);

    const gainSyncSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = gainSyncSpy;
    internals.autoBoosterMode = "off";
    autoBoosterClient.queryInjectableTabs.mockResolvedValue([
      { id: 16, url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab
    ]);
    await internals.syncGlobalAutoBoosterGain(500);
    expect(gainSyncSpy).not.toHaveBeenCalled();

    internals.autoBoosterMode = "global";
    internals.autoSuppressedTabs.add(16);
    await internals.syncGlobalAutoBoosterGain(500);
    expect(gainSyncSpy).not.toHaveBeenCalled();
  });

  it("covers global-enable skips and site-sync fallback settings branches", async () => {
    const { orchestrator, internals, autoBoosterClient, storage } = createHarness();
    const activateSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = activateSpy;

    await storage.setAdvancedAudioSettings({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "maximum_clarity",
      softClipMix: 12.4
    });

    autoBoosterClient.queryInjectableTabs.mockResolvedValue([
      { title: "Missing id", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab,
      { id: 21, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab,
      { id: 22, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab
    ]);

    await orchestrator.handlePopupCommand({
      type: "ENABLE_GLOBAL_AUTO_BOOSTER",
      payload: { tabId: 22, gainPercent: 280 }
    });

    expect(activateSpy).toHaveBeenCalledTimes(1);
    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 22 }),
      "global",
      280
    );

    activateSpy.mockClear();
    internals.autoBoosterMode = "off";
    internals.siteEnabledAutoTabs.clear();
    internals.siteEnabledAutoTabs.add(23);
    tabsGet.mockResolvedValue({ id: 23, title: "Rumble", url: "https://rumble.com/demo" } as chrome.tabs.Tab);

    await internals.syncConfiguredAutoTabs();

    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 23 }),
      "site",
      undefined,
      expect.objectContaining({
        qualityPreset: "maximum_clarity",
        softClipMix: 12.4
      })
    );

    activateSpy.mockClear();
    internals.autoTabStates.set(24, {
      tabId: 24,
      title: "Rumble",
      url: "https://rumble.com/demo",
      domain: "rumble.com",
      favIconUrl: "https://rumble.com/favicon.ico",
      autoAttachState: "attached",
      autoBoosterScope: "site",
      gainPercent: 220
    });
    tabsGet.mockResolvedValueOnce({ id: 24, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab);

    await internals.resumeAutoLaneIfNeeded(24);

    expect(activateSpy).not.toHaveBeenCalled();
  });

  it("covers validation, scope helpers, and badge helper branches", async () => {
    vi.useFakeTimers();
    const { internals, orchestrator } = createHarness();
    tabsGet.mockResolvedValueOnce({ title: "Missing", url: "https://youtube.com" });
    await expect(internals.validateTabForAutoBooster(1)).rejects.toMatchObject({
      key: "errorTabNoLongerExists"
    });

    tabsGet.mockResolvedValueOnce({ id: 2, title: "Chrome", url: "chrome://extensions" });
    await expect(internals.validateTabForAutoBooster(2)).rejects.toMatchObject({
      key: "errorTabNotCapturable"
    });

    tabsGet.mockResolvedValueOnce({ id: 3, title: "YouTube", url: "https://youtube.com/watch?v=1" });
    await expect(internals.validateTabForAutoBooster(3)).resolves.toMatchObject({ id: 3 });

    internals.markAutoUnsupported({ title: "No id" } as chrome.tabs.Tab, "global");
    expect(internals.autoTabStates.size).toBe(0);

    internals.markAutoUnsupported(
      { id: 4, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab,
      "global"
    );
    expect(internals.autoTabStates.get(4)?.autoAttachState).toBe("unsupported");

    internals.siteEnabledAutoTabs.add(7);
    internals.autoSuppressedTabs.add(7);
    internals.autoSessions.set(
      7,
      makeSession(7, "youtube.com", 200, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "site"
      })
    );
    internals.autoTabStates.set(7, {
      tabId: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "attached",
      autoBoosterScope: "site",
      gainPercent: 200
    });
    internals.resetNavigationScopedAutoState(7);
    expect(internals.siteEnabledAutoTabs.has(7)).toBe(false);
    expect(internals.autoSessions.has(7)).toBe(false);
    expect(internals.autoSuppressedTabs.has(7)).toBe(false);

    internals.siteEnabledAutoTabs.add(8);
    expect(internals.getAutoScopeForTab(8)).toBe("site");
    internals.siteEnabledAutoTabs.clear();
    internals.autoTabStates.set(9, {
      tabId: 9,
      title: "Rumble",
      url: "https://rumble.com/demo",
      domain: "rumble.com",
      favIconUrl: "https://rumble.com/favicon.ico",
      autoAttachState: "observing",
      autoBoosterScope: "global",
      gainPercent: 100
    });
    expect(internals.getAutoScopeForTab(9)).toBe("global");
    expect(internals.getAutoScopeForTab(10)).toBeUndefined();
    expect(internals.shouldAutoRemainEnabled(8)).toBe(false);
    internals.autoBoosterMode = "global";
    expect(internals.shouldAutoRemainEnabled(10)).toBe(true);
    internals.autoSuppressedTabs.add(10);
    expect(internals.shouldAutoRemainEnabled(10)).toBe(false);

    expect(internals.toErrorMessage(message("errorTabNotCapturable"))).toEqual(
      message("errorTabNotCapturable")
    );
    expect(internals.toErrorMessage(new Error("boom"))).toEqual(message("errorExtensionActionFailed"));

    const activeSession = makeSession(20, "youtube.com", 220);
    internals.sessions.set(20, activeSession);
    expect(internals.updateAudibleState(20, 0.4)).toBe(true);
    expect(internals.isTabAudible(20)).toBe(true);

    expect(internals.updateAudibleState(20, 0)).toBe(false);
    vi.advanceTimersByTime(2_000);
    expect(internals.isTabAudible(20)).toBe(false);

    internals.sessions.set(24, makeSession(24, "kick.com", 200));
    internals.audibleTabs.set(24, Date.now() - 1);
    expect(internals.updateAudibleState(24, 0)).toBe(false);
    expect(internals.audibleTabs.has(24)).toBe(false);

    internals.sessions.set(21, makeSession(21, "youtube.com", 220, { streamState: "inactive" }));
    internals.audibleTabs.set(21, Date.now() + 5_000);
    expect(internals.updateAudibleState(21, 0.4)).toBe(false);
    expect(internals.audibleTabs.has(21)).toBe(false);

    internals.sessions.set(22, makeSession(22, "rumble.com", 180));
    internals.audibleTabs.set(22, Date.now() - 1);
    internals.pruneAudibleTabs();
    expect(internals.audibleTabs.has(22)).toBe(false);

    internals.sessions.set(23, makeSession(23, "kick.com", 190));
    internals.audibleTabs.set(23, Date.now() + 5_000);
    internals.syncBadgePulseTimer();
    expect(internals.badgePulseTimer).not.toBeNull();

    internals.audibleTabs.clear();
    vi.advanceTimersByTime(1_100);
    expect(internals.badgePulseTimer).toBeNull();

    internals.badgedTabs.add(20);
    await internals.syncActionBadges();
    expect(actionSetBadgeText).toHaveBeenCalled();

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          sendMessage: runtimeSendMessage
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
    await internals.syncActionBadges();

    await expect(
      (orchestrator as unknown as { handleBackgroundEvent(input: unknown): Promise<void> }).handleBackgroundEvent({
        type: "UNKNOWN"
      })
    ).resolves.toBeUndefined();
  });

  it("keeps global auto mode unset by default and clears site state only for the requested tab", () => {
    const { internals } = createHarness();

    expect(internals.autoBoosterMode).toBe("off");
    expect(internals.badgePulseHighlighted).toBe(false);

    internals.siteEnabledAutoTabs.add(100);
    internals.siteEnabledAutoTabs.add(101);
    internals.resetNavigationScopedAutoState(100);

    expect(internals.siteEnabledAutoTabs.has(100)).toBe(false);
    expect(internals.siteEnabledAutoTabs.has(101)).toBe(true);
  });

  it("builds cached debug state with suspended and attached session details", async () => {
    const { orchestrator, internals, autoBoosterClient } = createHarness();
    autoBoosterClient.getDebugState.mockRejectedValue(new Error("worker asleep"));
    tabsQuery.mockResolvedValue([]);

    internals.manualSessions.set(7, makeSession(7, "youtube.com", 220));
    internals.autoSessions.set(
      7,
      makeSession(7, "youtube.com", 220, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "site",
        level: 0.77
      })
    );
    internals.autoTabStates.set(7, {
      tabId: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoBoosterScope: "site",
      gainPercent: 220,
      lastError: message("errorAutoAttachFailed")
    });
    internals.autoSuppressedTabs.add(7);

    const response = await orchestrator.handlePopupCommand({
      type: "GET_DEBUG_STATE",
      payload: { tabId: 7 }
    });

    expect(response).toEqual({
      ok: true,
      data: {
        tabId: 7,
        lane: "auto_media_element",
        enabled: true,
        suspended: true,
        scope: "site",
        attachState: "attached",
        attachReason: undefined,
        audioContextState: "none",
        autoplayPolicy: undefined,
        mediaElementCount: 0,
        attachedElementCount: 1,
        lastTelemetryAt: null,
        lastLevel: 0.77,
        lastError: message("errorAutoAttachFailed"),
        lastTechnicalError: undefined,
        currentUrl: "https://youtube.com/watch?v=1"
      }
    });
  });

  it("builds cached debug state as suspended when only a manual session is present for the tab", async () => {
    const { orchestrator, internals, autoBoosterClient } = createHarness();
    autoBoosterClient.getDebugState.mockRejectedValue(new Error("worker asleep"));
    tabsQuery.mockResolvedValue([]);

    internals.manualSessions.set(17, makeSession(17, "youtube.com", 220));
    internals.autoTabStates.set(17, {
      tabId: 17,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      autoBoosterScope: "site",
      gainPercent: 220
    });

    const response = await orchestrator.handlePopupCommand({
      type: "GET_DEBUG_STATE",
      payload: { tabId: 17 }
    });

    expect(response).toEqual({
      ok: true,
      data: expect.objectContaining({
        tabId: 17,
        suspended: true,
        attachedElementCount: 0,
        lastLevel: 0
      })
    });
  });

  it("uses manual-session gain fallback when pausing auto lane and ignores missing tab fetches safely", async () => {
    const { internals, autoBoosterClient } = createHarness();
    internals.siteEnabledAutoTabs.add(7);
    internals.manualSessions.set(7, makeSession(7, "youtube.com", 333));

    tabsGet.mockResolvedValueOnce({
      id: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1"
    } as chrome.tabs.Tab);

    await internals.pauseAutoLaneForManual(7);

    expect(autoBoosterClient.configure).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        scope: "site",
        enabled: true,
        suspended: true,
        gainPercent: 333
      })
    );

    autoBoosterClient.configure.mockClear();
    tabsGet.mockRejectedValueOnce(new Error("gone"));
    await internals.pauseAutoLaneForManual(7);
    expect(autoBoosterClient.configure).not.toHaveBeenCalled();
  });

  it("marks generic global auto attach failures as failed with attach_failed reason", async () => {
    const { internals, autoBoosterClient } = createHarness();
    autoBoosterClient.configure.mockRejectedValueOnce(new Error("boom"));

    await internals.activateAutoBoosterForTab(
      {
        id: 17,
        url: "https://kick.com/demo"
      } as chrome.tabs.Tab,
      "global"
    );

    expect(internals.autoTabStates.get(17)).toMatchObject({
      title: "https://kick.com/demo",
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      lastError: message("errorExtensionActionFailed")
    });
  });

  it("marks unsupported tabs with exact fallback title, reason and error message", () => {
    const { internals } = createHarness();

    internals.markAutoUnsupported(
      {
        id: 77,
        url: "https://rumble.com/demo"
      } as chrome.tabs.Tab,
      "global"
    );

    expect(internals.autoTabStates.get(77)).toEqual({
      tabId: 77,
      title: "https://rumble.com/demo",
      url: "https://rumble.com/demo",
      domain: "rumble.com",
      favIconUrl: undefined,
      autoAttachState: "unsupported",
      autoAttachReason: "site_not_hookable",
      autoBoosterScope: "global",
      gainPercent: 100,
      lastError: message("errorAutoUnsupportedSite")
    });
  });

  it("tracks badge text color, idle vs pulse background, threshold boundaries and badged tabs exactly", async () => {
    vi.useFakeTimers();
    const { internals } = createHarness();
    const now = Date.now();
    internals.sessions.set(31, makeSession(31, "youtube.com", 220, { level: 0 }));

    expect(internals.updateAudibleState(31, 0.025)).toBe(true);
    expect(internals.isTabAudible(31)).toBe(true);

    internals.badgePulseHighlighted = false;
    await internals.syncActionBadges();

    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 31, text: "🔊" });
    expect(actionSetBadgeTextColor).toHaveBeenCalledWith({ tabId: 31, color: "#0b0b0b" });
    expect(actionSetBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 31, color: "#101214" });
    expect(internals.badgedTabs.has(31)).toBe(true);

    actionSetBadgeBackgroundColor.mockClear();
    internals.badgePulseHighlighted = true;
    await internals.syncActionBadges();
    expect(actionSetBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 31, color: "#d72828" });

    internals.audibleTabs.set(31, now);
    expect(internals.isTabAudible(31)).toBe(false);
    expect(internals.updateAudibleState(31, 0)).toBe(false);
    expect(internals.audibleTabs.has(31)).toBe(false);
  });

  it("prunes audible tabs for inactive, missing and expired sessions and keeps live ones", () => {
    const { internals } = createHarness();
    const now = Date.now();

    internals.sessions.set(40, makeSession(40, "youtube.com", 220, { streamState: "inactive" }));
    internals.sessions.set(41, makeSession(41, "rumble.com", 220));
    internals.sessions.set(42, makeSession(42, "kick.com", 220));
    internals.audibleTabs.set(40, now + 1_000);
    internals.audibleTabs.set(41, now);
    internals.audibleTabs.set(42, now + 1_000);
    internals.audibleTabs.set(43, now + 1_000);

    internals.pruneAudibleTabs();

    expect(internals.audibleTabs.has(40)).toBe(false);
    expect(internals.audibleTabs.has(41)).toBe(false);
    expect(internals.audibleTabs.has(42)).toBe(true);
    expect(internals.audibleTabs.has(43)).toBe(false);
  });

  it("starts the badge pulse timer once, toggles highlight on ticks, and stops cleanly when audio ends", async () => {
    vi.useFakeTimers();
    const { internals } = createHarness();

    internals.sessions.set(50, makeSession(50, "youtube.com", 220));
    internals.audibleTabs.set(50, Date.now() + 5_000);

    const syncSpy = vi
      .spyOn(internals, "syncActionBadges")
      .mockResolvedValue(undefined as never);
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    internals.syncBadgePulseTimer();
    const firstTimer = internals.badgePulseTimer;
    expect(firstTimer).not.toBeNull();
    expect(internals.badgePulseHighlighted).toBe(false);

    internals.syncBadgePulseTimer();
    expect(internals.badgePulseTimer).toBe(firstTimer);

    vi.advanceTimersByTime(1_000);
    expect(internals.badgePulseHighlighted).toBe(true);
    expect(syncSpy).toHaveBeenCalled();

    internals.audibleTabs.clear();
    vi.advanceTimersByTime(1_000);
    expect(internals.badgePulseTimer).toBeNull();
    expect(internals.badgePulseHighlighted).toBe(false);
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockClear();
    internals.stopBadgePulseTimer();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it("creates exact auto sessions from attached status updates and clears them again for inactive updates", () => {
    const { internals } = createHarness();
    internals.audibleTabs.set(7, Date.now() + 5_000);

    internals.applyAutoStatusUpdate(makeAutoStatus());

    expect(internals.autoSessions.get(7)).toEqual({
      tabId: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      gainPercent: 220,
      engineLane: "auto_media_element",
      autoBoosterScope: "global",
      autoAttachState: "attached",
      autoAttachReason: undefined,
      streamState: "active",
      engineStatus: "ready",
      level: 0,
      warning: "none",
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: false,
      outputPeak: 0,
      updatedAt: expect.any(Number),
      lastError: undefined
    });

    internals.applyAutoStatusUpdate(
      makeAutoStatus({
        autoAttachState: "observing",
        streamState: "inactive",
        engineStatus: "loading"
      })
    );

    expect(internals.autoSessions.has(7)).toBe(false);
    expect(internals.audibleTabs.has(7)).toBe(false);
  });

  it("routes offscreen and content background events through their handlers without cross-triggering", async () => {
    const { orchestrator, internals } = createHarness();
    const offscreenSpy = vi.spyOn(internals, "handleOffscreenEvent" as never) as ReturnType<typeof vi.spyOn>;
    const contentSpy = vi.spyOn(internals, "handleContentEvent" as never) as ReturnType<typeof vi.spyOn>;

    await (orchestrator as unknown as { handleBackgroundEvent(input: unknown): Promise<void> }).handleBackgroundEvent({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 1,
        streamState: "active",
        engineStatus: "ready",
        gainPercent: 100
      }
    });
    expect(offscreenSpy).toHaveBeenCalledTimes(1);
    expect(contentSpy).not.toHaveBeenCalled();

    offscreenSpy.mockClear();
    await (orchestrator as unknown as { handleBackgroundEvent(input: unknown): Promise<void> }).handleBackgroundEvent({
      type: "AUTO_SESSION_TOAST_REQUESTED",
      payload: { tabId: 1 }
    });
    expect(offscreenSpy).not.toHaveBeenCalled();
    expect(contentSpy).toHaveBeenCalledTimes(1);
  });

  it("covers manual capture status transitions for active, pending and ignored tab ids", async () => {
    const { orchestrator, internals } = createHarness();
    internals.manualSessions.set(5, makeSession(5, "youtube.com", 240));

    await orchestrator.handleCaptureStatusChanged({ tabId: 999, status: "active" } as chrome.tabCapture.CaptureInfo);
    expect(internals.manualSessions.get(5)?.streamState).toBe("active");

    await orchestrator.handleCaptureStatusChanged({ tabId: 5, status: "pending" } as chrome.tabCapture.CaptureInfo);
    expect(internals.manualSessions.get(5)).toMatchObject({
      streamState: "pending",
      engineStatus: "loading",
      gainPercent: 240
    });

    await orchestrator.handleCaptureStatusChanged({ tabId: 5, status: "active" } as chrome.tabCapture.CaptureInfo);
    expect(internals.manualSessions.get(5)).toMatchObject({
      streamState: "active",
      engineStatus: "ready",
      gainPercent: 240
    });
  });

  it("removes manual captures on tab removal and clears related auto runtime state", async () => {
    const { orchestrator, internals, offscreenClient } = createHarness();
    offscreenClient.stopSession.mockResolvedValue([]);
    offscreenClient.closeIfIdle.mockResolvedValue(undefined);
    internals.manualSessions.set(7, makeSession(7, "youtube.com", 220));
    internals.autoSessions.set(
      7,
      makeSession(7, "youtube.com", 220, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "site"
      })
    );
    internals.autoTabStates.set(7, {
      tabId: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoBoosterScope: "site",
      gainPercent: 220
    });
    internals.siteEnabledAutoTabs.add(7);
    internals.autoSuppressedTabs.add(7);

    await orchestrator.handleTabRemoved(7);

    expect(offscreenClient.stopSession).toHaveBeenCalledWith(7);
    expect(offscreenClient.closeIfIdle).toHaveBeenCalledWith(0);
    expect(internals.manualSessions.has(7)).toBe(false);
    expect(internals.autoSessions.has(7)).toBe(false);
    expect(internals.autoTabStates.has(7)).toBe(false);
    expect(internals.siteEnabledAutoTabs.has(7)).toBe(false);
    expect(internals.autoSuppressedTabs.has(7)).toBe(false);
  });

  it("uses gain overrides, suspended flags and observing defaults exactly when activating auto booster tabs", async () => {
    const { internals, autoBoosterClient, storage } = createHarness();
    await storage.setGlobalAutoGainPercent(480);
    internals.manualSessions.set(70, makeSession(70, "youtube.com", 220));

    await internals.activateAutoBoosterForTab(
      {
        id: 70,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1"
      } as chrome.tabs.Tab,
      "global",
      305
    );

    expect(internals.autoTabStates.get(70)).toMatchObject({
      title: "YouTube",
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      autoBoosterScope: "global",
      gainPercent: 305
    });
    expect(autoBoosterClient.configure).toHaveBeenLastCalledWith(
      70,
      expect.objectContaining({
        scope: "global",
        enabled: true,
        suspended: true,
        gainPercent: 305
      })
    );

    internals.manualSessions.clear();
    internals.autoSuppressedTabs.add(71);
    await internals.activateAutoBoosterForTab(
      {
        id: 71,
        url: "https://rumble.com/demo"
      } as chrome.tabs.Tab,
      "global"
    );

    expect(internals.autoTabStates.get(71)).toMatchObject({
      title: "https://rumble.com/demo",
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      gainPercent: 480
    });
    expect(autoBoosterClient.configure).toHaveBeenLastCalledWith(
      71,
      expect.objectContaining({
        suspended: true,
        gainPercent: 480
      })
    );
  });

  it("falls back to default gain when pausing auto lane with no tracked audio sessions", async () => {
    const { internals, autoBoosterClient } = createHarness();
    internals.siteEnabledAutoTabs.add(18);
    tabsGet.mockResolvedValue({
      id: 18,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1"
    } as chrome.tabs.Tab);

    await internals.pauseAutoLaneForManual(18);

    expect(autoBoosterClient.configure).toHaveBeenCalledWith(
      18,
      expect.objectContaining({
        gainPercent: 100,
        suspended: true
      })
    );
  });

  it("only disables global-scoped runtime tabs when deactivating global mode", async () => {
    const { internals, autoBoosterClient, storage } = createHarness();
    internals.autoBoosterMode = "global";
    internals.autoTabStates.set(80, {
      tabId: 80,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: undefined,
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoBoosterScope: "global",
      gainPercent: 200
    });
    internals.autoTabStates.set(81, {
      tabId: 81,
      title: "Rumble",
      url: "https://rumble.com/demo",
      domain: "rumble.com",
      favIconUrl: undefined,
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoBoosterScope: "site",
      gainPercent: 200
    });
    internals.autoSessions.set(
      82,
      makeSession(82, "kick.com", 220, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "global"
      })
    );
    internals.autoSessions.set(
      83,
      makeSession(83, "twitch.tv", 220, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "site"
      })
    );

    await internals.deactivateGlobalAutoBooster();

    expect(await storage.getAutoBoosterMode()).toBe("off");
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(80);
    expect(autoBoosterClient.disable).toHaveBeenCalledWith(82);
    expect(autoBoosterClient.disable).not.toHaveBeenCalledWith(81);
    expect(autoBoosterClient.disable).not.toHaveBeenCalledWith(83);
  });

  it("filters unsupported and suppressed tabs out of global configured syncs and gain syncs", async () => {
    const { internals, autoBoosterClient } = createHarness();
    const activateSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = activateSpy;
    internals.autoBoosterMode = "global";
    internals.autoSuppressedTabs.add(92);
    tabsGet.mockImplementation(async (tabId: number) => {
      switch (tabId) {
        case 90:
          return { id: 90, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab;
        case 91:
          return { id: 91, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab;
        case 92:
          return { id: 92, title: "Rumble", url: "https://rumble.com/demo" } as chrome.tabs.Tab;
        default:
          throw new Error("missing");
      }
    });
    autoBoosterClient.queryInjectableTabs.mockResolvedValue([
      { id: 90, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab,
      { id: 91, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab,
      { id: 92, title: "Rumble", url: "https://rumble.com/demo" } as chrome.tabs.Tab,
      { title: "Missing", url: "https://kick.com/demo" } as chrome.tabs.Tab
    ]);

    await internals.syncConfiguredAutoTabs(DEFAULT_ADVANCED_AUDIO_SETTINGS);
    await internals.syncGlobalAutoBoosterGain(320);

    expect(activateSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 90 }),
      "global",
      undefined,
      DEFAULT_ADVANCED_AUDIO_SETTINGS
    );
    expect(activateSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 90 }),
      "global",
      320
    );
    expect(activateSpy).toHaveBeenCalledTimes(2);
  });

  it("does not mark inactive or merely audible sessions as badged unless they are both active and audible", async () => {
    const { internals } = createHarness();
    internals.sessions.set(110, makeSession(110, "youtube.com", 220, { streamState: "inactive" }));
    internals.sessions.set(111, makeSession(111, "rumble.com", 220, { streamState: "active" }));
    internals.audibleTabs.set(110, Date.now() + 5_000);
    internals.audibleTabs.set(111, Date.now() - 1);

    await internals.syncActionBadges();

    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 110, text: "" });
    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 111, text: "" });
    expect(internals.badgedTabs.size).toBe(0);
  });

  it("supports badge syncing even when badge text color is unavailable", async () => {
    const { internals } = createHarness();
    internals.sessions.set(120, makeSession(120, "youtube.com", 220));
    internals.audibleTabs.set(120, Date.now() + 5_000);

    vi.stubGlobal(
      "chrome",
      {
        runtime: { sendMessage: runtimeSendMessage },
        action: {
          setBadgeText: actionSetBadgeText,
          setBadgeBackgroundColor: actionSetBadgeBackgroundColor
        },
        tabs: { get: tabsGet, query: tabsQuery },
        tabCapture: { getMediaStreamId }
      } as unknown as typeof chrome
    );

    await internals.syncActionBadges();

    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 120, text: "🔊" });
    expect(actionSetBadgeBackgroundColor).toHaveBeenCalled();
  });

  it("preserves auto state on non-navigation updates and clears it on loading navigations", async () => {
    const { orchestrator, internals } = createHarness();
    internals.siteEnabledAutoTabs.add(200);
    internals.autoTabStates.set(200, {
      tabId: 200,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: undefined,
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoBoosterScope: "site",
      gainPercent: 220
    });
    tabsQuery.mockResolvedValue([]);

    await orchestrator.handleTabUpdated(
      200,
      { status: "complete" },
      { id: 200, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab
    );
    expect(internals.siteEnabledAutoTabs.has(200)).toBe(true);

    await orchestrator.handleTabUpdated(
      200,
      { status: "loading" },
      { id: 200, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab
    );
    expect(internals.siteEnabledAutoTabs.has(200)).toBe(false);
    expect(internals.autoTabStates.has(200)).toBe(false);
  });

  it("marks unsupported tabs during global updates with exact unsupported state", async () => {
    const { orchestrator, internals, storage } = createHarness();
    await storage.setAutoBoosterMode("global");
    internals.autoBoosterMode = "global";
    tabsQuery.mockResolvedValue([]);

    await orchestrator.handleTabUpdated(
      201,
      { url: "chrome://extensions" },
      { id: 201, title: undefined, url: "chrome://extensions" } as chrome.tabs.Tab
    );

    expect(internals.autoTabStates.get(201)).toEqual({
      tabId: 201,
      title: "chrome://extensions",
      url: "chrome://extensions",
      domain: undefined,
      favIconUrl: undefined,
      autoAttachState: "unsupported",
      autoAttachReason: "site_not_hookable",
      autoBoosterScope: "global",
      gainPercent: 100,
      lastError: message("errorAutoUnsupportedSite")
    });
  });

  it("covers startCapture guards and start failure cleanup branches", async () => {
    const { orchestrator, internals, offscreenClient } = createHarness();
    tabsQuery.mockResolvedValue([]);

    tabsGet.mockResolvedValueOnce({ title: "Missing", url: "https://youtube.com/watch?v=1" });
    await expect(
      orchestrator.handlePopupCommand({
        type: "START_CAPTURE",
        payload: { tabId: 300, gainPercent: 220 }
      })
    ).resolves.toMatchObject({ ok: false, errorMessage: { key: "errorTabNoLongerExists" } });

    tabsGet.mockResolvedValueOnce({ id: 301, title: "Chrome", url: "chrome://extensions" });
    await expect(
      orchestrator.handlePopupCommand({
        type: "START_CAPTURE",
        payload: { tabId: 301, gainPercent: 220 }
      })
    ).resolves.toMatchObject({ ok: false, errorMessage: { key: "errorTabNotCapturable" } });

    tabsGet.mockResolvedValueOnce({ id: 302, url: "https://youtube.com/watch?v=1" });
    getMediaStreamId.mockResolvedValueOnce("stream-302");
    offscreenClient.startSession.mockRejectedValueOnce(new Error("boom"));

    await expect(
      orchestrator.handlePopupCommand({
        type: "START_CAPTURE",
        payload: { tabId: 302, gainPercent: 220 }
      })
    ).resolves.toMatchObject({ ok: false, errorMessage: { key: "errorExtensionActionFailed" } });

    expect(internals.manualSessions.has(302)).toBe(false);
  });

  it("uses the exact targetTabId and default title fallback when starting capture", async () => {
    const { orchestrator, offscreenClient } = createHarness();
    tabsQuery.mockResolvedValue([]);
    tabsGet.mockResolvedValueOnce({ id: 303, url: "https://youtube.com/watch?v=1" });
    getMediaStreamId.mockResolvedValueOnce("stream-303");
    offscreenClient.startSession.mockResolvedValueOnce([makeSession(303, "youtube.com", 220)]);

    await orchestrator.handlePopupCommand({
      type: "START_CAPTURE",
      payload: { tabId: 303, gainPercent: 220 }
    });

    expect(getMediaStreamId).toHaveBeenCalledWith({ targetTabId: 303 });
    expect(offscreenClient.startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "https://youtube.com/watch?v=1"
      })
    );
  });

  it("keeps manual sessions when offscreen snapshot is empty but replaces them when a new snapshot arrives or when none exist", async () => {
    const { internals, offscreenClient } = createHarness();

    internals.manualSessions.set(400, makeSession(400, "youtube.com", 220));
    offscreenClient.getSnapshot.mockResolvedValueOnce([]);
    await internals.syncFromOffscreen();
    expect(internals.manualSessions.has(400)).toBe(true);

    offscreenClient.getSnapshot.mockResolvedValueOnce([makeSession(401, "rumble.com", 180)]);
    await internals.syncFromOffscreen();
    expect(internals.manualSessions.has(400)).toBe(false);
    expect(internals.manualSessions.has(401)).toBe(true);

    internals.manualSessions.clear();
    offscreenClient.getSnapshot.mockResolvedValueOnce([]);
    await internals.syncFromOffscreen();
    expect(internals.manualSessions.size).toBe(0);
  });

  it("builds current-tab summaries with exact preference and auto-attach precedence", async () => {
    const { orchestrator, internals, storage } = createHarness();
    await storage.setDomainGain("youtube.com", 250);
    tabsQuery.mockResolvedValue([
      {
        id: 400,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        favIconUrl: "https://youtube.com/favicon.ico"
      } as chrome.tabs.Tab
    ]);

    internals.autoTabStates.set(400, {
      tabId: 400,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "awaiting_user_gesture",
      autoAttachReason: "autoplay_blocked",
      autoBoosterScope: "global",
      gainPercent: 250
    });

    const cachedStateResponse = await orchestrator.handlePopupCommand({ type: "GET_STATE" });
    expect(cachedStateResponse).toMatchObject({
      ok: true,
      data: {
        currentTab: {
          tabId: 400,
          preferredGainPercent: 250,
          hasStoredPreference: true,
          autoAttachState: "awaiting_user_gesture",
          autoAttachReason: "autoplay_blocked"
        }
      }
    });

    internals.autoSessions.set(
      400,
      makeSession(400, "youtube.com", 250, {
        engineLane: "auto_media_element",
        autoBoosterScope: "global",
        autoAttachState: "attached",
        autoAttachReason: "source_conflict"
      })
    );

    const liveStateResponse = await orchestrator.handlePopupCommand({ type: "GET_STATE" });
    expect(liveStateResponse).toMatchObject({
      ok: true,
      data: {
        currentTab: {
          tabId: 400,
          activeLane: "auto_media_element",
          autoAttachState: "attached",
          autoAttachReason: "source_conflict"
        }
      }
    });

    tabsQuery.mockResolvedValue([
      {
        id: 401,
        title: "Rumble",
        url: "https://rumble.com/demo"
      } as chrome.tabs.Tab
    ]);
    internals.autoSessions.clear();
    internals.autoTabStates.clear();

    const defaultStateResponse = await orchestrator.handlePopupCommand({ type: "GET_STATE" });
    expect(defaultStateResponse).toMatchObject({
      ok: true,
      data: {
        currentTab: {
          tabId: 401,
          preferredGainPercent: 100,
          hasStoredPreference: false,
          autoAttachState: "idle"
        }
      }
    });
  });

  it("skips offscreen advanced-settings sync when there are no manual sessions and skips offscreen stopAll when there are none", async () => {
    const { internals, offscreenClient } = createHarness();

    await (internals as unknown as {
      setAdvancedAudioSettings(settings: AdvancedAudioSettings): Promise<void>;
    }).setAdvancedAudioSettings(DEFAULT_ADVANCED_AUDIO_SETTINGS);
    expect(offscreenClient.setAdvancedAudioSettings).not.toHaveBeenCalled();

    await internals.stopAll();
    expect(offscreenClient.stopAll).not.toHaveBeenCalled();
  });

  it("clears audible state when manual status turns inactive", () => {
    const { internals } = createHarness();
    internals.manualSessions.set(500, makeSession(500, "youtube.com", 220));
    internals.audibleTabs.set(500, Date.now() + 5_000);

    internals.applyManualStatusUpdate({
      tabId: 500,
      streamState: "inactive",
      engineStatus: "ready",
      gainPercent: 220
    });

    expect(internals.audibleTabs.has(500)).toBe(false);
  });

  it("keeps manual audible state and lastError clean for active capture-status updates while ignoring invalid tab ids", async () => {
    const { orchestrator, internals } = createHarness();
    internals.manualSessions.set(505, makeSession(505, "youtube.com", 275));
    internals.audibleTabs.set(505, Date.now() + 5_000);

    await expect(
      orchestrator.handleCaptureStatusChanged({
        tabId: "invalid"
      } as unknown as chrome.tabCapture.CaptureInfo)
    ).resolves.toBeUndefined();

    await expect(
      orchestrator.handleCaptureStatusChanged({
        tabId: 999,
        status: "active"
      } as chrome.tabCapture.CaptureInfo)
    ).resolves.toBeUndefined();

    await orchestrator.handleCaptureStatusChanged({
      tabId: 505,
      status: "active"
    } as chrome.tabCapture.CaptureInfo);

    expect(internals.manualSessions.get(505)).toMatchObject({
      streamState: "active",
      engineStatus: "ready",
      gainPercent: 275,
      lastError: undefined
    });
    expect(internals.audibleTabs.has(505)).toBe(true);
  });

  it("marks stopped manual captures with the exact last error and keeps the current gain", async () => {
    const { orchestrator, internals } = createHarness();
    internals.manualSessions.set(501, makeSession(501, "youtube.com", 275));

    await orchestrator.handleCaptureStatusChanged({
      tabId: 501,
      status: "stopped"
    } as chrome.tabCapture.CaptureInfo);

    expect(internals.manualSessions.get(501)).toMatchObject({
      streamState: "inactive",
      engineStatus: "ready",
      gainPercent: 275,
      lastError: message("errorCaptureStopped")
    });
  });

  it("normalizes manual sessions and creates empty auto sessions with exact defaults", () => {
    const { internals } = createHarness();

    expect(
      internals.normalizeManualSession(
        makeSession(600, "youtube.com", 220, {
          autoAttachState: "attached",
          autoAttachReason: "attach_failed"
        })
      )
    ).toMatchObject({
      engineLane: "manual_tab_capture",
      autoAttachState: "idle",
      autoAttachReason: undefined
    });

    expect(
      internals.createEmptyAutoSession(
        makeAutoStatus({
          tabId: 601,
          autoAttachState: "attached",
          autoAttachReason: "autoplay_blocked"
        })
      )
    ).toEqual({
      tabId: 601,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      gainPercent: 220,
      engineLane: "auto_media_element",
      autoBoosterScope: "global",
      autoAttachState: "attached",
      autoAttachReason: "autoplay_blocked",
      streamState: "active",
      engineStatus: "ready",
      level: 0,
      warning: "none",
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: false,
      outputPeak: 0,
      updatedAt: expect.any(Number),
      lastError: undefined
    });
  });

  it("does not store global gain but does refresh the current global auto tab when setGain is applied to a manual tab", async () => {
    const { internals, storage, offscreenClient } = createHarness();
    const syncGlobalSpy = vi.fn(async () => undefined);
    const activateSpy = vi.fn(async () => undefined);
    internals.syncGlobalAutoBoosterGain = syncGlobalSpy;
    internals.activateAutoBoosterForTab = activateSpy;
    internals.autoBoosterMode = "global";
    internals.manualSessions.set(700, makeSession(700, "youtube.com", 220));
    offscreenClient.setGain.mockResolvedValue([makeSession(700, "youtube.com", 360)]);
    tabsGet.mockResolvedValue({ id: 700, title: "YouTube", url: "https://youtube.com/watch?v=1" } as chrome.tabs.Tab);

    await internals.setGain(700, 360);

    expect(await storage.getGlobalAutoGainPercent()).toBe(100);
    expect(syncGlobalSpy).not.toHaveBeenCalled();
    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 700 }),
      "global",
      360
    );
  });

  it("rejects enabling global mode when permission is denied", async () => {
    const { orchestrator, autoBoosterClient } = createHarness();
    autoBoosterClient.requestGlobalPermission.mockResolvedValueOnce(false);
    tabsQuery.mockResolvedValue([]);

    await expect(
      orchestrator.handlePopupCommand({
        type: "ENABLE_GLOBAL_AUTO_BOOSTER",
        payload: { tabId: 800, gainPercent: 220 }
      })
    ).resolves.toMatchObject({
      ok: false,
      errorMessage: { key: "errorAutoGlobalPermissionDenied" }
    });
  });

  it("does not resume auto lanes when tabs.get fails or returns unsupported tabs", async () => {
    const { internals } = createHarness();
    const activateSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = activateSpy;
    internals.siteEnabledAutoTabs.add(810);

    tabsGet.mockRejectedValueOnce(new Error("gone"));
    await internals.resumeAutoLaneIfNeeded(810);
    tabsGet.mockResolvedValueOnce({ id: 810, title: "Chrome", url: "chrome://extensions" } as chrome.tabs.Tab);
    await internals.resumeAutoLaneIfNeeded(810);

    expect(activateSpy).not.toHaveBeenCalled();
  });

  it("ignores level updates for missing manual sessions and only syncs badges when audibility changes", async () => {
    const { internals } = createHarness();
    const syncBadgesSpy = vi.fn(async () => undefined);
    internals.syncActionBadges = syncBadgesSpy;

    await (internals as unknown as {
      handleOffscreenEvent(messageValue: unknown): Promise<void>;
    }).handleOffscreenEvent({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 999,
        level: 0.6,
        warning: "high",
        protectorActionDb: 3,
        clipEvents: 1,
        clipPeak: 0.5,
        protectionBypassed: false,
        outputPeak: 0.55
      }
    });
    expect(syncBadgesSpy).not.toHaveBeenCalled();

    internals.manualSessions.set(910, makeSession(910, "youtube.com", 220, { level: 0.01 }));
    internals.sessions.set(910, makeSession(910, "youtube.com", 220, { level: 0.01 }));
    internals.updateAudibleState = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await (internals as unknown as {
      handleOffscreenEvent(messageValue: unknown): Promise<void>;
    }).handleOffscreenEvent({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 910,
        level: 0.2,
        warning: "high",
        protectorActionDb: 3,
        clipEvents: 1,
        clipPeak: 0.5,
        protectionBypassed: false,
        outputPeak: 0.55
      }
    });
    expect(syncBadgesSpy).not.toHaveBeenCalled();

    await (internals as unknown as {
      handleOffscreenEvent(messageValue: unknown): Promise<void>;
    }).handleOffscreenEvent({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 910,
        level: 0.8,
        warning: "danger",
        protectorActionDb: 9,
        clipEvents: 2,
        clipPeak: 1.1,
        protectionBypassed: false,
        outputPeak: 0.92
      }
    });
    expect(syncBadgesSpy).toHaveBeenCalledTimes(1);
  });

  it("creates manual provisional sessions with exact pending defaults before tab capture resolves", async () => {
    const { orchestrator, internals, offscreenClient } = createHarness();
    tabsQuery.mockResolvedValue([]);
    tabsGet.mockResolvedValue({
      id: 930,
      url: "https://youtube.com/watch?v=1"
    } as chrome.tabs.Tab);

    let resolveStreamId: ((value: string) => void) | undefined;
    const streamIdPromise = new Promise<string>((resolve) => {
      resolveStreamId = resolve;
    });
    getMediaStreamId.mockReturnValue(streamIdPromise);
    offscreenClient.startSession.mockResolvedValue([makeSession(930, "youtube.com", 220)]);

    const commandPromise = orchestrator.handlePopupCommand({
      type: "START_CAPTURE",
      payload: { tabId: 930, gainPercent: 220 }
    });

    for (let attempt = 0; attempt < 5 && !internals.manualSessions.get(930); attempt += 1) {
      await Promise.resolve();
    }

    expect(internals.manualSessions.get(930)).toMatchObject({
      title: "https://youtube.com/watch?v=1",
      url: "https://youtube.com/watch?v=1",
      gainPercent: 220,
      engineLane: "manual_tab_capture",
      autoAttachState: "idle",
      streamState: "pending",
      engineStatus: "loading",
      warning: "none"
    });

    resolveStreamId?.("stream-930");
    await commandPromise;
  });

  it("keeps attached auto sessions only when both attach state and stream state are active", () => {
    const { internals } = createHarness();

    internals.applyAutoStatusUpdate(
      makeAutoStatus({
        tabId: 940,
        autoAttachState: "attached",
        streamState: "inactive"
      })
    );
    expect(internals.autoSessions.has(940)).toBe(false);

    internals.applyAutoStatusUpdate(
      makeAutoStatus({
        tabId: 941,
        autoAttachState: "observing",
        streamState: "active"
      })
    );
    expect(internals.autoSessions.has(941)).toBe(false);

    internals.applyAutoStatusUpdate(
      makeAutoStatus({
        tabId: 942,
        autoAttachState: "attached",
        streamState: "active"
      })
    );
    expect(internals.autoSessions.get(942)).toMatchObject({
      tabId: 942,
      autoAttachState: "attached",
      streamState: "active"
    });
  });

  it("syncs site tabs without querying global tabs when global mode is off", async () => {
    const { internals, autoBoosterClient } = createHarness();
    const activateSpy = vi.fn(async () => undefined);
    internals.activateAutoBoosterForTab = activateSpy;
    internals.autoBoosterMode = "off";
    internals.siteEnabledAutoTabs.add(950);
    tabsGet.mockResolvedValue({
      id: 950,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1"
    } as chrome.tabs.Tab);

    await internals.syncConfiguredAutoTabs(DEFAULT_ADVANCED_AUDIO_SETTINGS);

    expect(autoBoosterClient.queryInjectableTabs).not.toHaveBeenCalled();
    expect(activateSpy).toHaveBeenCalledTimes(1);
    expect(activateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 950 }),
      "site",
      undefined,
      DEFAULT_ADVANCED_AUDIO_SETTINGS
    );
  });

  it("does not deactivate global mode when enabling the current tab booster outside global mode", async () => {
    const { internals } = createHarness();
    internals.autoBoosterMode = "off";
    const deactivateSpy = vi.fn(async () => undefined);
    const startCaptureSpy = vi.fn(async () => undefined);
    internals.deactivateGlobalAutoBooster = deactivateSpy;
    (internals as unknown as { startCapture(tabId: number, gainPercent: number): Promise<void> }).startCapture =
      startCaptureSpy;

    await (internals as unknown as {
      enableCurrentTabBooster(tabId: number, gainPercent: number): Promise<void>;
    }).enableCurrentTabBooster(970, 240);

    expect(deactivateSpy).not.toHaveBeenCalled();
    expect(startCaptureSpy).toHaveBeenCalledWith(970, 240);
  });

  it("does not suppress site tabs when stopping auto tabs and only collects site-scoped tabs when disabling site mode", async () => {
    const { internals, autoBoosterClient } = createHarness();
    internals.siteEnabledAutoTabs.add(900);
    await internals.stopAutoForTab(900);
    expect(internals.autoSuppressedTabs.has(900)).toBe(false);

    autoBoosterClient.disable.mockClear();
    internals.autoTabStates.set(901, {
      tabId: 901,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: undefined,
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoBoosterScope: "global",
      gainPercent: 220
    });
    internals.autoSessions.set(
      902,
      makeSession(902, "rumble.com", 220, {
        engineLane: "auto_media_element",
        autoAttachState: "attached",
        autoBoosterScope: "global"
      })
    );
    internals.siteEnabledAutoTabs.add(903);

    await internals.disableAllSiteAutoTabs();

    expect(autoBoosterClient.disable).toHaveBeenCalledWith(903);
    expect(autoBoosterClient.disable).not.toHaveBeenCalledWith(901);
    expect(autoBoosterClient.disable).not.toHaveBeenCalledWith(902);
  });
});
