import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import type { CaptureSessionState, WorkerState } from "../shared/types";
import { buildPopupViewModel } from "./model";

function makeSession(
  tabId: number,
  gainPercent: number,
  warning: CaptureSessionState["warning"],
  updatedAt: number
): CaptureSessionState {
  return {
    tabId,
    title: `Tab ${tabId}`,
    gainPercent,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.5,
    warning,
    protectorActionDb: 4.2,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.74,
    updatedAt
  };
}

describe("buildPopupViewModel", () => {
  it("derives current, manual and automatic sessions independently for the active tab", () => {
    const manualSession = makeSession(7, 240, "high", 10);
    const autoSession: CaptureSessionState = {
      ...makeSession(7, 320, "none", 11),
      engineLane: "auto_media_element",
      autoAttachState: "attached"
    };
    const state: WorkerState = {
      currentTab: {
        tabId: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: true,
        preferredGainPercent: 240,
        hasStoredPreference: true,
        autoAttachState: "attached"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "off",
      globalAutoGainPercent: 100,
      sessions: [manualSession, autoSession, makeSession(9, 180, "none", 9)],
      generatedAt: 11
    };

    const viewModel = buildPopupViewModel(state);

    expect(viewModel.currentSession).toBe(manualSession);
    expect(viewModel.currentManualSession).toBe(manualSession);
    expect(viewModel.currentAutoSession).toBe(autoSession);
    expect(viewModel.gainPercent).toBe(240);
  });

  it("separates the current tab session from background sessions", () => {
    const state: WorkerState = {
      currentTab: {
        tabId: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: true,
        preferredGainPercent: 240,
        hasStoredPreference: true,
        autoAttachState: "idle"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "off",
      globalAutoGainPercent: 100,
      sessions: [makeSession(7, 240, "high", 10), makeSession(9, 180, "none", 9)],
      generatedAt: 11
    };

    const viewModel = buildPopupViewModel(state);

    expect(viewModel.currentSession?.tabId).toBe(7);
    expect(viewModel.activeSessions).toHaveLength(2);
    expect(viewModel.gainPercent).toBe(240);
    expect(viewModel.canStart).toBe(true);
    expect(viewModel.advancedAudioSettings.qualityPreset).toBe("balanced");
  });

  it("preserves the incoming active session order instead of re-sorting cards locally", () => {
    const state: WorkerState = {
      currentTab: {
        tabId: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: true,
        preferredGainPercent: 240,
        hasStoredPreference: true,
        autoAttachState: "idle"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "off",
      globalAutoGainPercent: 100,
      sessions: [
        makeSession(10, 220, "none", 1),
        makeSession(9, 320, "danger", 999),
        makeSession(7, 240, "high", 100)
      ],
      generatedAt: 11
    };

    const viewModel = buildPopupViewModel(state);

    expect(viewModel.activeSessions.map((session) => session.tabId)).toEqual([10, 9, 7]);
  });

  it("returns no active session data when the current tab is missing or invalid", () => {
    const invalidTabState: WorkerState = {
      currentTab: {
        tabId: -1,
        title: "Invalid",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: false,
        preferredGainPercent: 240,
        hasStoredPreference: true,
        autoAttachState: "idle"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "off",
      globalAutoGainPercent: 320,
      sessions: [makeSession(-1, 240, "high", 10)],
      generatedAt: 11
    };

    const missingTabState: WorkerState = {
      ...invalidTabState,
      currentTab: null,
      sessions: [makeSession(1, 180, "none", 9)]
    };

    const invalidViewModel = buildPopupViewModel(invalidTabState);
    const missingViewModel = buildPopupViewModel(missingTabState);

    expect(invalidViewModel.currentSession).toBeNull();
    expect(invalidViewModel.currentManualSession).toBeNull();
    expect(invalidViewModel.currentAutoSession).toBeNull();
    expect(invalidViewModel.gainPercent).toBe(100);
    expect(invalidViewModel.canStart).toBe(false);

    expect(missingViewModel.currentSession).toBeNull();
    expect(missingViewModel.currentManualSession).toBeNull();
    expect(missingViewModel.currentAutoSession).toBeNull();
    expect(missingViewModel.gainPercent).toBe(100);
    expect(missingViewModel.canStart).toBe(false);
  });

  it("accepts tab id 1 as a valid current tab id", () => {
    const state: WorkerState = {
      currentTab: {
        tabId: 1,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: true,
        preferredGainPercent: 180,
        hasStoredPreference: false,
        autoAttachState: "idle"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "off",
      globalAutoGainPercent: 320,
      sessions: [makeSession(1, 180, "none", 9)],
      generatedAt: 11
    };

    const viewModel = buildPopupViewModel(state);

    expect(viewModel.currentSession?.tabId).toBe(1);
    expect(viewModel.gainPercent).toBe(180);
  });

  it("defaults the visible gain back to 100% when the current tab has no active session", () => {
    const state: WorkerState = {
      currentTab: {
        tabId: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: true,
        preferredGainPercent: 10000,
        hasStoredPreference: true,
        autoAttachState: "idle"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "off",
      globalAutoGainPercent: 100,
      sessions: [makeSession(9, 180, "none", 9)],
      generatedAt: 11
    };

    const viewModel = buildPopupViewModel(state);

    expect(viewModel.currentSession).toBeNull();
    expect(viewModel.gainPercent).toBe(100);
  });

  it("keeps the default draft gain when global mode is off and only the stored global gain changed", () => {
    const state: WorkerState = {
      currentTab: {
        tabId: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: true,
        preferredGainPercent: 100,
        hasStoredPreference: false,
        autoAttachState: "idle"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "off",
      globalAutoGainPercent: 320,
      sessions: [],
      generatedAt: 11
    };

    const viewModel = buildPopupViewModel(state);

    expect(viewModel.gainPercent).toBe(100);
  });

  it("uses the global auto gain as the visible draft gain when global auto mode is armed", () => {
    const state: WorkerState = {
      currentTab: {
        tabId: 7,
        title: "YouTube",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        supported: true,
        preferredGainPercent: 100,
        hasStoredPreference: false,
        autoAttachState: "observing"
      },
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      autoBoosterMode: "global",
      globalAutoGainPercent: 320,
      sessions: [],
      generatedAt: 11
    };

    const viewModel = buildPopupViewModel(state);

    expect(viewModel.currentSession).toBeNull();
    expect(viewModel.gainPercent).toBe(320);
  });
});
