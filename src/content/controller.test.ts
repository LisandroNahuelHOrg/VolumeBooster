const controllerFaustMetaHoisted = vi.hoisted(() => ({
  default: {
    name: "prism-premium-test",
    compile_options: "-single",
    ui: [
      { shortname: "controls_input_drive_db", address: "/controls/input_drive_db" },
      { shortname: "controls_lookahead_ms", address: "/controls/lookahead_ms" },
      { shortname: "controls_release_ms", address: "/controls/release_ms" },
      { shortname: "controls_multiband_depth", address: "/controls/multiband_depth" },
      { shortname: "controls_protector_enabled", address: "/controls/protector_enabled" },
      { shortname: "controls_output_limiter_enabled", address: "/controls/output_limiter_enabled" },
      { shortname: "controls_low_band_trim_db", address: "/controls/low_band_trim_db" },
      { shortname: "controls_low_band_makeup_db", address: "/controls/low_band_makeup_db" },
      { shortname: "controls_low_band_threshold_offset_db", address: "/controls/low_band_threshold_offset_db" },
      { shortname: "controls_low_band_ratio_bias", address: "/controls/low_band_ratio_bias" },
      { shortname: "controls_mid_high_threshold_offset_db", address: "/controls/mid_high_threshold_offset_db" },
      { shortname: "controls_output_ceiling_db", address: "/controls/output_ceiling_db" },
      { shortname: "controls_output_soft_clip_mix", address: "/controls/output_soft_clip_mix" },
      { shortname: "controls_clarity_presence_tilt_db", address: "/controls/clarity_presence_tilt_db" },
      { shortname: "controls_tone_low_band_gain_db", address: "/controls/tone_low_band_gain_db" },
      { shortname: "controls_tone_mid_band_gain_db", address: "/controls/tone_mid_band_gain_db" }
    ]
  }
}));

vi.mock("../generated/faust/mono/dsp-meta", () => controllerFaustMetaHoisted);
vi.mock("../generated/faust/stereo/dsp-meta", () => controllerFaustMetaHoisted);

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { getDuckDuckGoFaviconUrl } from "../shared/domain";
import type {
  AutoBoosterConfigPayload,
  DspRuntimeMetrics,
  LevelWarning,
  LocalizedMessage
} from "../shared/types";
import { AutoBoosterController } from "./controller";
import {
  BRIDGE_STATUS_EVENT,
  BRIDGE_TELEMETRY_EVENT,
  type BridgeStatusPayload,
  createBridgeStatusEvent,
  createBridgeTelemetryEvent
} from "./bridge-protocol";
import type { MediaElementSessionHandle } from "./media-element-session";
import { MediaElementSession, MediaElementSessionError } from "./media-element-session";

function makeTelemetry(
  warning: LevelWarning = "none",
  metrics: Partial<DspRuntimeMetrics> = {}
) {
  return {
    level: 0.32,
    warning,
    metrics: {
      protectorActionDb: 2.1,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: false,
      inputPeak: 0.44,
      outputPeak: 0.36,
      ...metrics
    }
  };
}

function makePayload(overrides: Partial<AutoBoosterConfigPayload> = {}): AutoBoosterConfigPayload {
  return {
    tabId: 7,
    scope: "global",
    enabled: true,
    suspended: false,
    gainPercent: 220,
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
    ...overrides
  };
}

type FakeSession = {
  setProcessingEnabled: ReturnType<typeof vi.fn>;
  setGainPercent: ReturnType<typeof vi.fn>;
  setAdvancedAudioSettings: ReturnType<typeof vi.fn>;
  sampleTelemetry: ReturnType<typeof vi.fn>;
  getDebugState: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

type TrackedSessionEntry = {
  session: unknown;
  lastTelemetry: ReturnType<typeof makeTelemetry>;
};

function createFakeSession(overrides: Partial<FakeSession> = {}): FakeSession {
  return {
    setProcessingEnabled: vi.fn(),
    setGainPercent: vi.fn(),
    setAdvancedAudioSettings: vi.fn(),
    sampleTelemetry: vi.fn().mockReturnValue(makeTelemetry()),
    getDebugState: vi.fn().mockReturnValue({
      audioContextState: "running",
      autoplayPolicy: "allowed"
    }),
    stop: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("AutoBoosterController", () => {
  const runtimeSendMessage = vi.fn();
  const i18nGetMessage = vi.fn();
  let fakeMediaElement: HTMLMediaElement;
  const intervalCallbacks = new Map<number, () => void>();
  let nextIntervalId = 1;
  let documentQuerySelectorAll = vi.fn<() => HTMLMediaElement[]>();
  let documentContains = vi.fn<(node: Node) => boolean>();
  let documentQuerySelector = vi.fn();
  let windowAddEventListener = vi.fn();
  let windowClearInterval = vi.fn();
  let documentAddEventListener = vi.fn();
  let documentElementAppendChild = vi.fn();
  let timeoutCallbacks: Array<() => void> = [];
  let observerInstances: Array<{
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    callback: MutationCallback;
  }> = [];

  beforeEach(() => {
    runtimeSendMessage.mockReset();
    i18nGetMessage.mockReset().mockImplementation((key: string) => {
      const dictionary: Record<string, string> = {
        tabUntitled: "Untitled tab",
        autoBoosterFailureToast:
          "Automatic booster could not hook this page. Use the manual booster from the popup."
      };
      return dictionary[key] ?? key;
    });
    fakeMediaElement = {
      currentSrc: "https://cdn.example.com/audio.mp4",
      srcObject: null,
      paused: false,
      ended: false,
      readyState: 2,
      currentTime: 1,
      played: {
        length: 1
      } as TimeRanges,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLMediaElement;
    documentQuerySelectorAll = vi.fn(() => [fakeMediaElement]);
    documentContains = vi.fn(() => true);
    documentQuerySelector = vi.fn(() => null);
    windowAddEventListener = vi.fn();
    documentAddEventListener = vi.fn();
    documentElementAppendChild = vi.fn((node: HTMLElement) => node);
    timeoutCallbacks = [];
    observerInstances = [];
    intervalCallbacks.clear();
    nextIntervalId = 1;

    class FakeMutationObserver {
      readonly observe = vi.fn();
      readonly disconnect = vi.fn();
      constructor(callback: MutationCallback) {
        observerInstances.push({ observe: this.observe, disconnect: this.disconnect, callback });
      }
    }

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          sendMessage: runtimeSendMessage
        },
        i18n: {
          getMessage: i18nGetMessage
        }
      } as unknown as typeof chrome
    );
    vi.stubGlobal("window", {
      location: { href: "https://youtube.com/watch?v=1" },
      setInterval: vi.fn((callback: () => void) => {
        const id = nextIntervalId++;
        intervalCallbacks.set(id, callback);
        return id;
      }),
      clearInterval: windowClearInterval.mockImplementation((id: number) => {
        intervalCallbacks.delete(id);
      }),
      setTimeout: vi.fn((callback: () => void) => {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      }),
      addEventListener: windowAddEventListener
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal("document", {
      title: "Test video",
      documentElement: {
        appendChild: documentElementAppendChild
      },
      querySelectorAll: documentQuerySelectorAll,
      querySelector: documentQuerySelector,
      contains: documentContains,
      addEventListener: documentAddEventListener,
      createElement: vi.fn(() => ({
        className: "",
        textContent: "",
        style: {},
        remove: vi.fn()
      }))
    } as unknown as Document);
    vi.stubGlobal("MutationObserver", FakeMutationObserver as unknown as typeof MutationObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts with an idle empty debug state before any configuration is applied", () => {
    const controller = new AutoBoosterController();

    expect(controller.getDebugState()).toEqual({
      tabId: null,
      lane: "auto_media_element",
      enabled: false,
      suspended: false,
      scope: null,
      attachState: "idle",
      attachReason: undefined,
      audioContextState: "none",
      autoplayPolicy: undefined,
      mediaElementCount: 1,
      attachedElementCount: 0,
      frameCount: 1,
      readyFrameCount: 1,
      attachedFrameCount: 0,
      toastVisible: false,
      lastTelemetryAt: null,
      lastLevel: 0,
      lastError: undefined,
      lastTechnicalError: undefined,
      currentUrl: "https://youtube.com/watch?v=1"
    });
  });

  it("keeps exact bridge defaults and binds bridge listeners only once when the api exists", () => {
    const controller = new AutoBoosterController();
    const internal = controller as unknown as {
      bridgeStatus: BridgeStatusPayload;
      bridgeTelemetry: {
        activeStrategy: "none" | "web_audio_bridge";
        level: number;
        warning: LevelWarning;
        metrics: DspRuntimeMetrics;
        audioContextCount: number;
        attachedNodeCount: number;
        lastTelemetryAt: number;
      };
      bridgeListenersBound: boolean;
      ensureBridgeListeners(): void;
    };

    expect(internal.bridgeStatus).toEqual({
      enabled: false,
      suspended: false,
      scope: null,
      attachState: "idle",
      activeStrategy: "none",
      audioContextState: "none",
      autoplayPolicy: undefined,
      audioContextCount: 0,
      attachedNodeCount: 0,
      currentUrl: "https://youtube.com/watch?v=1"
    });
    expect(internal.bridgeTelemetry).toEqual({
      activeStrategy: "none",
      level: 0,
      warning: "none",
      metrics: {
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      },
      audioContextCount: 0,
      attachedNodeCount: 0,
      lastTelemetryAt: 0
    });

    internal.ensureBridgeListeners();
    internal.ensureBridgeListeners();

    expect(windowAddEventListener).toHaveBeenCalledTimes(2);
    expect(windowAddEventListener).toHaveBeenNthCalledWith(1, BRIDGE_STATUS_EVENT, expect.any(Function));
    expect(windowAddEventListener).toHaveBeenNthCalledWith(2, BRIDGE_TELEMETRY_EVENT, expect.any(Function));
    expect(internal.bridgeListenersBound).toBe(true);
  });

  it("reports exact idle and suspended status payloads without booting media sessions", async () => {
    const createSpy = vi.spyOn(MediaElementSession, "create");
    const controller = new AutoBoosterController();

    await controller.configure(
      makePayload({
        enabled: false
      })
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(controller.getDebugState()).toMatchObject({
      tabId: 7,
      scope: "global",
      enabled: false,
      suspended: false,
      attachState: "idle",
      attachReason: undefined
    });
    expect(runtimeSendMessage).toHaveBeenLastCalledWith({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload: expect.objectContaining({
        tabId: 7,
        autoAttachState: "idle",
        autoAttachReason: undefined,
        streamState: "inactive",
        engineStatus: "ready"
      })
    });

    runtimeSendMessage.mockClear();
    await controller.configure(
      makePayload({
        suspended: true
      })
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(controller.getDebugState()).toMatchObject({
      enabled: true,
      suspended: true,
      attachState: "observing",
      attachReason: "no_media"
    });
    expect(runtimeSendMessage).toHaveBeenLastCalledWith({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload: expect.objectContaining({
        tabId: 7,
        autoAttachState: "observing",
        autoAttachReason: "no_media",
        streamState: "inactive",
        engineStatus: "ready"
      })
    });
  });

  it("reapplies gain and advanced settings to tracked auto sessions on reconfigure", async () => {
    const fakeSession = createFakeSession();
    const createSpy = vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());

    fakeSession.setGainPercent.mockClear();
    fakeSession.setAdvancedAudioSettings.mockClear();

    const nextSettings = {
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "maximum_clarity" as const,
      softClipMix: 13.5
    };

    await controller.configure(
      makePayload({
        gainPercent: 360,
        advancedAudioSettings: nextSettings
      })
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(fakeSession.setGainPercent).toHaveBeenCalledWith(360);
    expect(fakeSession.setAdvancedAudioSettings).toHaveBeenCalledWith(nextSettings);

    await controller.destroy();
  });

  it("reapplies gain immediately and queues a refresh when reconfigure happens mid-refresh", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    await Promise.resolve();
    await Promise.resolve();

    fakeSession.setGainPercent.mockClear();
    fakeSession.setAdvancedAudioSettings.mockClear();
    fakeSession.setProcessingEnabled.mockClear();
    (
      controller as unknown as {
        refreshInFlight: boolean;
        refreshQueued: boolean;
      }
    ).refreshInFlight = true;

    await controller.configure(
      makePayload({
        gainPercent: 1000
      })
    );

    expect(fakeSession.setGainPercent).toHaveBeenCalledWith(1000);
    expect(fakeSession.setAdvancedAudioSettings).toHaveBeenCalled();
    expect(fakeSession.setProcessingEnabled).toHaveBeenCalledWith(true);
    expect(
      (
        controller as unknown as {
          refreshQueued: boolean;
        }
      ).refreshQueued
    ).toBe(true);
  });

  it("returns from configure before the first refresh finishes so worker messaging does not stall", async () => {
    const controller = new AutoBoosterController();
    const refreshSpy = vi.fn(
      () =>
        new Promise<void>(() => {
          // Intentionally unresolved: configure must not await the first refresh.
        })
    );

    (
      controller as unknown as {
        runRefreshMediaTracking(): Promise<void>;
      }
    ).runRefreshMediaTracking = refreshSpy;

    await expect(controller.configure(makePayload())).resolves.toBeUndefined();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE"
      })
    );
  });

  it("publishes attached status and level telemetry when media is hooked successfully", async () => {
    const fakeSession = createFakeSession({
      sampleTelemetry: vi.fn().mockReturnValue(
        makeTelemetry("high", {
          protectorActionDb: 4.2,
          clipEvents: 2,
          clipPeak: 0.8,
          outputPeak: 0.41
        })
      )
    });
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());

    const debugState = controller.getDebugState();
    expect(debugState.attachState).toBe("attached");
    expect(debugState.attachedElementCount).toBe(1);

    const telemetryTick = [...intervalCallbacks.values()].at(-1);
    telemetryTick?.();

    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE"
      })
    );
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_LEVEL_UPDATE",
        payload: expect.objectContaining({
          level: 0.32,
          warning: "high",
          clipEvents: 2
        })
      })
    );
  });

  it("enters awaiting_user_gesture instead of failing when autoplay blocks web audio", async () => {
    vi.spyOn(MediaElementSession, "create").mockRejectedValue(
      new MediaElementSessionError("autoplay_blocked", "gesture needed", {
        audioContextState: "none",
        autoplayPolicy: "disallowed"
      })
    );
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());

    const debugState = controller.getDebugState();
    expect(debugState.attachState).toBe("awaiting_user_gesture");
    expect(debugState.attachReason).toBe("autoplay_blocked");
    expect(debugState.lastError).toEqual({ key: "errorAutoAwaitingGesture" } satisfies LocalizedMessage);
    expect(windowAddEventListener).toHaveBeenCalled();
    expect(documentAddEventListener).toHaveBeenCalledWith(
      "play",
      expect.any(Function),
      expect.objectContaining({ capture: true, once: true, signal: expect.any(AbortSignal) })
    );
  });

  it("re-queues the element for retry on source_conflict instead of marking the tab as failed", async () => {
    vi.spyOn(MediaElementSession, "create").mockRejectedValue(
      new MediaElementSessionError("source_conflict", "already connected", {
        audioContextState: "running",
        autoplayPolicy: "allowed"
      })
    );
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ scope: "global" }));

    // El elemento conflictivo se re-encola para observación continua, NO se marca como failed.
    expect(controller.getDebugState()).toMatchObject({
      attachState: "observing",
      attachReason: "no_media"
    });
    // No se disparan mensajes de fallo ni toast
    expect(runtimeSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "AUTO_SESSION_ATTACH_FAILED" })
    );
    expect(runtimeSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "AUTO_SESSION_TOAST_REQUESTED" })
    );
    expect(documentElementAppendChild).not.toHaveBeenCalled();
    expect(fakeMediaElement.addEventListener).toHaveBeenCalled();
  });

  it("keeps the lane attached when a later source conflict happens after media was already attached", async () => {
    const secondMediaElement = {
      currentSrc: "https://cdn.example.com/second.mp4",
      srcObject: null,
      paused: false,
      ended: false,
      readyState: 2,
      currentTime: 1,
      played: { length: 1 } as TimeRanges,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLMediaElement;
    const firstSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create")
      .mockResolvedValueOnce(firstSession as never)
      .mockRejectedValueOnce(
        new MediaElementSessionError("source_conflict", "already connected", {
          audioContextState: "running",
          autoplayPolicy: "allowed"
        })
      );
    documentQuerySelectorAll.mockReturnValue([fakeMediaElement, secondMediaElement]);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    runtimeSendMessage.mockClear();

    await (controller as unknown as { refreshMediaTracking(): Promise<void> }).refreshMediaTracking();

    expect(controller.getDebugState()).toMatchObject({
      attachState: "attached",
      attachReason: undefined,
      attachedElementCount: 1
    });
    expect(runtimeSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "AUTO_SESSION_ATTACH_FAILED" })
    );
    expect(secondMediaElement.addEventListener).toHaveBeenCalled();
  });

  it("reports generic attach failures and keeps the lane usable for fallback", async () => {
    vi.spyOn(MediaElementSession, "create").mockRejectedValue(new Error("boom"));
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());

    expect(controller.getDebugState()).toMatchObject({
      attachState: "failed",
      attachReason: "attach_failed",
      lastError: { key: "errorAutoAttachFailed" },
      lastTechnicalError: "boom"
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_ATTACH_FAILED"
      })
    );
  });

  it("suspends processing without tearing down sessions and disables cleanly", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    await controller.configure(makePayload({ suspended: true }));

    expect(fakeSession.setProcessingEnabled).toHaveBeenLastCalledWith(false);
    expect(controller.getDebugState().suspended).toBe(true);

    await controller.disable(7);

    expect(controller.getDebugState()).toMatchObject({
      enabled: false,
      suspended: false,
      attachState: "idle",
      attachReason: undefined
    });
  });

  it("ignores disable requests for a different tab id", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    await Promise.resolve();
    fakeSession.setProcessingEnabled.mockClear();

    await controller.disable(999);

    expect(controller.getDebugState()).toMatchObject({
      enabled: true,
      attachState: "attached"
    });
  });

  it("retries after a gesture block and prunes detached sessions during rescans", async () => {
    const fakeSession = createFakeSession();
    const createSpy = vi
      .spyOn(MediaElementSession, "create")
      .mockRejectedValueOnce(
        new MediaElementSessionError("autoplay_blocked", "gesture needed", {
          audioContextState: "none",
          autoplayPolicy: "disallowed"
        })
      )
      .mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    expect(controller.getDebugState().attachState).toBe("awaiting_user_gesture");

    await (controller as unknown as { handleGestureRetry: () => Promise<void> }).handleGestureRetry();
    await Promise.resolve();
    await Promise.resolve();

    expect(createSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(controller.getDebugState()).toMatchObject({
      attachState: "attached",
      attachReason: undefined,
      attachedElementCount: 1
    });

    documentContains.mockReturnValue(false);
    documentQuerySelectorAll.mockReturnValue([]);
    await (controller as unknown as { handleDomMutation: () => Promise<void> }).handleDomMutation();

    expect(fakeSession.stop).toHaveBeenCalledTimes(1);
    expect(controller.getDebugState()).toMatchObject({
      attachState: "observing",
      attachReason: "no_media",
      attachedElementCount: 0
    });
  });

  it("prunes detached sessions on every dom mutation but only refreshes tracking when enabled with settings", async () => {
    const controller = new AutoBoosterController();
    const pruneSpy = vi.spyOn(
      controller as unknown as { pruneDetachedSessions(): void },
      "pruneDetachedSessions"
    );
    const refreshSpy = vi.spyOn(
      controller as unknown as { refreshMediaTracking(): Promise<void> },
      "refreshMediaTracking"
    );

    await controller.configure(
      makePayload({
        enabled: false
      })
    );

    await (controller as unknown as { handleDomMutation(): Promise<void> }).handleDomMutation();
    expect(pruneSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).not.toHaveBeenCalled();

    (
      controller as unknown as {
        state: {
          enabled: boolean;
          advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
          };
        }
      ).state,
      enabled: true,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    };

    await (controller as unknown as { handleDomMutation(): Promise<void> }).handleDomMutation();
    expect(pruneSpy).toHaveBeenCalledTimes(2);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("reacts to url changes and reports the new page metadata", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    runtimeSendMessage.mockClear();
    (window as Window).location.href = "https://rumble.com/video";
    (document as Document).title = "Rumble video";

    (controller as unknown as { syncLocationState: () => void }).syncLocationState();

    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE",
        payload: expect.objectContaining({
          title: "Rumble video",
          url: "https://rumble.com/video"
        })
      })
    );
  });

  it("creates exactly one observer and watches the full document subtree", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    await controller.configure(makePayload({ gainPercent: 260 }));

    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0]?.observe).toHaveBeenCalledWith(document.documentElement, {
      childList: true,
      subtree: true
    });
  });

  it("destroys tracked sessions, disconnects the observer and clears the history timer", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    await controller.destroy();

    expect(fakeSession.stop).toHaveBeenCalledTimes(1);
    expect(observerInstances[0]?.disconnect).toHaveBeenCalledTimes(1);
    expect(windowClearInterval).toHaveBeenCalled();
    expect(controller.getDebugState()).toMatchObject({
      attachedElementCount: 0
    });
  });

  it("destroys safely before activation without requiring an observer", async () => {
    const controller = new AutoBoosterController();

    await expect(controller.destroy()).resolves.toBeUndefined();

    expect(windowClearInterval).toHaveBeenCalled();
  });

  it("delegates the history poll interval to syncLocationState", () => {
    const controller = new AutoBoosterController();
    const syncLocationStateSpy = vi.spyOn(
      controller as unknown as { syncLocationState: () => void },
      "syncLocationState"
    );

    intervalCallbacks.get(1)?.();

    expect(syncLocationStateSpy).toHaveBeenCalledTimes(1);
  });

  it("delegates mutation observer callbacks to the dom-mutation handler", async () => {
    const controller = new AutoBoosterController();
    const handleDomMutationSpy = vi
      .spyOn(controller as unknown as { handleDomMutation: () => Promise<void> }, "handleDomMutation")
      .mockResolvedValue(undefined);

    await controller.configure(makePayload());

    observerInstances[0]?.callback([], {} as MutationObserver);
    await Promise.resolve();

    expect(handleDomMutationSpy).toHaveBeenCalledTimes(1);
  });

  it("stays in observing/no_media and resets debug context when enabled with no media elements", async () => {
    documentQuerySelectorAll.mockReturnValue([]);
    const controller = new AutoBoosterController();
    (
      controller as unknown as {
        lastAudioContextState: AudioContextState | "none";
        lastAutoplayPolicy?: string;
      }
    ).lastAudioContextState = "running";
    (
      controller as unknown as {
        lastAudioContextState: AudioContextState | "none";
        lastAutoplayPolicy?: string;
      }
    ).lastAutoplayPolicy = "allowed";

    await controller.configure(makePayload());

    expect(controller.getDebugState()).toMatchObject({
      attachState: "observing",
      attachReason: "no_media",
      mediaElementCount: 0,
      audioContextState: "none",
      autoplayPolicy: undefined
    });
    expect(documentQuerySelectorAll).toHaveBeenCalledWith("audio, video");
  });

  it("disables active sessions and tears down the telemetry loop when configured off after attachment", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    fakeSession.setProcessingEnabled.mockClear();
    runtimeSendMessage.mockClear();
    const baselineIntervals = intervalCallbacks.size;

    await controller.configure(makePayload({ enabled: false }));

    expect(fakeSession.setProcessingEnabled).toHaveBeenCalledWith(false);
    expect(intervalCallbacks.size).toBeLessThan(baselineIntervals);
    expect(windowClearInterval).toHaveBeenCalled();
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload: expect.objectContaining({
        autoAttachState: "idle",
        autoAttachReason: undefined,
        engineLane: "auto_media_element"
      })
    });
  });

  it("does nothing when the url did not actually change", () => {
    const controller = new AutoBoosterController();
    const pruneSpy = vi.spyOn(
      controller as unknown as { pruneDetachedSessions: () => void },
      "pruneDetachedSessions"
    );
    const reportStatusSpy = vi.spyOn(
      controller as unknown as { reportStatus: () => void },
      "reportStatus"
    );
    const scanForMediaElementsSpy = vi.spyOn(
      controller as unknown as { scanForMediaElements: () => Promise<void> },
      "scanForMediaElements"
    );

    (controller as unknown as { syncLocationState: () => void }).syncLocationState();

    expect(runtimeSendMessage).not.toHaveBeenCalled();
    expect(pruneSpy).not.toHaveBeenCalled();
    expect(reportStatusSpy).not.toHaveBeenCalled();
    expect(scanForMediaElementsSpy).not.toHaveBeenCalled();
  });

  it("falls back to an untitled title and prefers the explicit favicon when present", async () => {
    documentQuerySelector.mockImplementation((selector: string) => {
      if (selector === 'link[rel~="icon"][href]') {
        return { href: "https://youtube.com/favicon.ico" };
      }

      return null;
    });
    (document as Document).title = "";
    const controller = new AutoBoosterController();

    await controller.configure(
      makePayload({
        enabled: false
      })
    );

    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE",
        payload: expect.objectContaining({
          title: "Untitled tab",
          favIconUrl: "https://youtube.com/favicon.ico"
        })
      })
    );
  });

  it("falls back to the DuckDuckGo favicon url when no explicit favicon link exists", async () => {
    const controller = new AutoBoosterController();

    await controller.configure(
      makePayload({
        enabled: false
      })
    );

    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE",
        payload: expect.objectContaining({
          favIconUrl: getDuckDuckGoFaviconUrl("youtube.com")
        })
      })
    );
  });

  it("prefers the shortcut-icon favicon when the generic rel=icon link is missing", async () => {
    documentQuerySelector.mockImplementation((selector: string) => {
      if (selector === 'link[rel="shortcut icon"][href]') {
        return { href: "https://youtube.com/shortcut.ico" };
      }

      return null;
    });
    const controller = new AutoBoosterController();

    await controller.configure(
      makePayload({
        enabled: false
      })
    );

    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE",
        payload: expect.objectContaining({
          favIconUrl: "https://youtube.com/shortcut.ico"
        })
      })
    );
  });

  it("keeps the lane observing when telemetry runs with no tracked sessions", async () => {
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ enabled: false }));
    runtimeSendMessage.mockClear();
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          tabId: number | null;
          attachState: "attached" | "observing";
          attachReason?: "no_media";
        };
        publishTelemetry: () => void;
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            tabId: number | null;
            attachState: "idle" | "attached" | "observing";
            attachReason?: "no_media";
          };
        }
      ).state,
      enabled: true,
      suspended: false,
      tabId: 7,
      attachState: "attached"
    };

    (controller as unknown as { publishTelemetry: () => void }).publishTelemetry();

    expect(controller.getDebugState()).toMatchObject({
      attachState: "observing",
      attachReason: "no_media"
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE"
      })
    );
  });

  it("does not rescan media on dom mutations when settings are missing", async () => {
    const controller = new AutoBoosterController();
    const refreshSpy = vi.spyOn(
      controller as unknown as { refreshMediaTracking: () => Promise<void> },
      "refreshMediaTracking"
    );

    (
      controller as unknown as {
        state: {
          enabled: boolean;
          advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
          };
        }
      ).state,
      enabled: true,
      advancedAudioSettings: null
    };

    await (controller as unknown as { handleDomMutation: () => Promise<void> }).handleDomMutation();

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(documentQuerySelectorAll).not.toHaveBeenCalled();
  });

  it("does not scan or sync tracked sessions when advanced settings are missing", async () => {
    const controller = new AutoBoosterController();
    const fakeSession = createFakeSession();
    (
      controller as unknown as {
        trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      }
    ).trackedSessions.set(fakeMediaElement, {
      session: fakeSession,
      lastTelemetry: makeTelemetry()
    });
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
          };
        }
      ).state,
      enabled: true,
      advancedAudioSettings: null
    };

    await (controller as unknown as { scanForMediaElements: () => Promise<void> }).scanForMediaElements();
    (controller as unknown as { syncTrackedSessionsConfiguration: () => void }).syncTrackedSessionsConfiguration();

    expect(documentQuerySelectorAll).not.toHaveBeenCalled();
    expect(fakeSession.setGainPercent).not.toHaveBeenCalled();
    expect(fakeSession.setAdvancedAudioSettings).not.toHaveBeenCalled();
  });

  it("starts the telemetry loop once and stops it cleanly", () => {
    const controller = new AutoBoosterController();
    const baselineIntervals = intervalCallbacks.size;

    (controller as unknown as { startTelemetryLoop: () => void }).startTelemetryLoop();
    (controller as unknown as { startTelemetryLoop: () => void }).startTelemetryLoop();

    expect(intervalCallbacks.size).toBe(baselineIntervals + 1);

    (controller as unknown as { stopTelemetryLoop: () => void }).stopTelemetryLoop();
    (controller as unknown as { stopTelemetryLoop: () => void }).stopTelemetryLoop();

    expect(intervalCallbacks.size).toBe(baselineIntervals);
  });

  it("aggregates multiple tracked telemetry samples with exact max, sum and bypass semantics", async () => {
    const controller = new AutoBoosterController();
    const fakeSessionA = createFakeSession({
      sampleTelemetry: vi.fn().mockReturnValue(
        makeTelemetry("high", {
          protectorActionDb: 6.4,
          clipEvents: 2,
          clipPeak: 0.71,
          protectionBypassed: false,
          outputPeak: 0.34
        })
      )
    });
    const fakeSessionB = createFakeSession({
      sampleTelemetry: vi.fn().mockReturnValue({
        level: 0.81,
        warning: "danger",
        metrics: {
          protectorActionDb: 8.9,
          clipEvents: 5,
          clipPeak: 1.21,
          protectionBypassed: true,
          inputPeak: 0.92,
          outputPeak: 0.58
        }
      })
    });

    const trackedSessions = (
      controller as unknown as {
        trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      }
    ).trackedSessions;
    trackedSessions.set({} as HTMLMediaElement, {
      session: fakeSessionA,
      lastTelemetry: makeTelemetry()
    });
    trackedSessions.set({} as HTMLMediaElement, {
      session: fakeSessionB,
      lastTelemetry: makeTelemetry()
    });
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          tabId: number | null;
          attachState: "attached";
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            tabId: number | null;
            attachState: "idle" | "attached";
          };
        }
      ).state,
      enabled: true,
      suspended: false,
      tabId: 7,
      attachState: "attached"
    };

    await (controller as unknown as { publishTelemetry(): void }).publishTelemetry();

    expect(controller.getDebugState()).toMatchObject({
      lastLevel: 0.81,
      lastTelemetryAt: expect.any(Number)
    });
    expect(runtimeSendMessage).toHaveBeenLastCalledWith({
      type: "AUTO_SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 7,
        isTopFrame: true,
        frameUrl: "https://youtube.com/watch?v=1",
        level: 0.81,
        warning: "danger",
        protectorActionDb: 8.9,
        clipEvents: 7,
        clipPeak: 1.21,
        protectionBypassed: true,
        outputPeak: 0.58
      }
    });
  });

  it("merges bridge telemetry maxima into the published payload and keeps bridge timestamps in debug state", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const controller = new AutoBoosterController();
    const fakeSession = createFakeSession({
      sampleTelemetry: vi.fn().mockReturnValue(
        makeTelemetry("high", {
          protectorActionDb: 3.5,
          clipEvents: 2,
          clipPeak: 0.55,
          protectionBypassed: false,
          outputPeak: 0.44
        })
      )
    });
    (
      controller as unknown as {
        trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
        bridgeTelemetry: {
          activeStrategy: "none" | "web_audio_bridge";
          level: number;
          warning: LevelWarning;
          metrics: DspRuntimeMetrics;
          audioContextCount: number;
          attachedNodeCount: number;
          lastTelemetryAt: number;
        };
        state: {
          enabled: boolean;
          suspended: boolean;
          tabId: number | null;
          attachState: "attached";
        };
        publishTelemetry(): void;
      }
    ).trackedSessions.set(fakeMediaElement, {
      session: fakeSession,
      lastTelemetry: makeTelemetry()
    });
    (
      controller as unknown as {
        bridgeTelemetry: {
          activeStrategy: "none" | "web_audio_bridge";
          level: number;
          warning: LevelWarning;
          metrics: DspRuntimeMetrics;
          audioContextCount: number;
          attachedNodeCount: number;
          lastTelemetryAt: number;
        };
      }
    ).bridgeTelemetry = {
      activeStrategy: "web_audio_bridge",
      level: 0.91,
      warning: "danger",
      metrics: {
        protectorActionDb: 8.75,
        clipEvents: 5,
        clipPeak: 1.2,
        protectionBypassed: true,
        inputPeak: 0.91,
        outputPeak: 0.88
      },
      audioContextCount: 2,
      attachedNodeCount: 3,
      lastTelemetryAt: 1234
    };
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          tabId: number | null;
          attachState: "idle" | "attached";
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            tabId: number | null;
            attachState: "idle" | "attached";
          };
        }
      ).state,
      enabled: true,
      suspended: false,
      tabId: 7,
      attachState: "attached"
    };

    (controller as unknown as { publishTelemetry(): void }).publishTelemetry();

    expect(controller.getDebugState()).toMatchObject({
      lastTelemetryAt: 1234,
      lastLevel: 0.91
    });
    expect(runtimeSendMessage).toHaveBeenLastCalledWith({
      type: "AUTO_SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 7,
        isTopFrame: true,
        frameUrl: "https://youtube.com/watch?v=1",
        level: 0.91,
        warning: "danger",
        protectorActionDb: 8.75,
        clipEvents: 7,
        clipPeak: 1.2,
        protectionBypassed: true,
        outputPeak: 0.88
      }
    });
  });

  it.each([
    [
      "disabled",
      {
        enabled: false,
        suspended: false,
        tabId: 7,
        attachState: "attached" as const
      }
    ],
    [
      "suspended",
      {
        enabled: true,
        suspended: true,
        tabId: 7,
        attachState: "attached" as const
      }
    ],
    [
      "missing tab id",
      {
        enabled: true,
        suspended: false,
        tabId: null,
        attachState: "attached" as const
      }
    ],
    [
      "not attached",
      {
        enabled: true,
        suspended: false,
        tabId: 7,
        attachState: "observing" as const
      }
    ]
  ])("does not sample or post telemetry when %s", (_label, stateOverride) => {
    const controller = new AutoBoosterController();
    const fakeSession = createFakeSession();
    (
      controller as unknown as {
        trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      }
    ).trackedSessions.set(fakeMediaElement, {
      session: fakeSession,
      lastTelemetry: makeTelemetry()
    });
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          tabId: number | null;
          attachState: "attached" | "observing";
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            tabId: number | null;
            attachState: "idle" | "attached" | "observing";
          };
        }
      ).state,
      ...stateOverride
    };

    (controller as unknown as { publishTelemetry: () => void }).publishTelemetry();

    expect(fakeSession.sampleTelemetry).not.toHaveBeenCalled();
    expect(runtimeSendMessage).not.toHaveBeenCalled();
  });

  it("keeps observing/no_media stable on same-url polls when retries are not armed", () => {
    const controller = new AutoBoosterController();
    const refreshSpy = vi.spyOn(
      controller as unknown as { runRefreshMediaTracking: () => Promise<void> },
      "runRefreshMediaTracking"
    );
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
          attachState: "observing" | "attached";
          attachReason?: "no_media" | "autoplay_blocked";
        };
        trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
            attachState: "idle" | "observing" | "attached";
            attachReason?: "no_media" | "autoplay_blocked";
          };
        }
      ).state,
      enabled: true,
      suspended: false,
      advancedAudioSettings: DEFAULT_ADVANCED_AUDIO_SETTINGS,
      attachState: "attached",
      attachReason: undefined
    };
    (
      controller as unknown as {
        trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      }
    ).trackedSessions.set(fakeMediaElement, {
      session: createFakeSession(),
      lastTelemetry: makeTelemetry()
    });

    (controller as unknown as { syncLocationState(): void }).syncLocationState();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("retries same-url rescans exactly at the interval boundary and blocks every gated negative case", () => {
    const controller = new AutoBoosterController();
    const controllerInternals = controller as unknown as {
      state: {
        enabled: boolean;
        suspended: boolean;
        advancedAudioSettings: AutoBoosterConfigPayload["advancedAudioSettings"] | null;
        attachState: "idle" | "observing" | "attached" | "awaiting_user_gesture" | "failed";
        attachReason?: "no_media" | "autoplay_blocked" | "attach_failed";
      };
      trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      lastLocationHref: string;
      lastAutoRetryAt: number;
      syncLocationState(): void;
      runRefreshMediaTracking(): Promise<void>;
    };
    const refreshSpy = vi.fn(async () => undefined);
    const nowSpy = vi.spyOn(Date, "now");

    controllerInternals.runRefreshMediaTracking = refreshSpy;
    controllerInternals.lastLocationHref = window.location.href;
    controllerInternals.lastAutoRetryAt = 1_000;
    controllerInternals.state.enabled = true;
    controllerInternals.state.suspended = false;
    controllerInternals.state.advancedAudioSettings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS };
    controllerInternals.state.attachState = "observing";
    controllerInternals.state.attachReason = "no_media";
    controllerInternals.trackedSessions.clear();

    nowSpy.mockReturnValueOnce(1_500);
    controllerInternals.syncLocationState();
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    const blockedCases: Array<{ label: string; setup: () => void }> = [
      {
        label: "disabled",
        setup: () => {
          controllerInternals.state.enabled = false;
          controllerInternals.state.suspended = false;
          controllerInternals.state.advancedAudioSettings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS };
          controllerInternals.state.attachState = "observing";
          controllerInternals.state.attachReason = "no_media";
          controllerInternals.trackedSessions.clear();
        }
      },
      {
        label: "suspended",
        setup: () => {
          controllerInternals.state.enabled = true;
          controllerInternals.state.suspended = true;
          controllerInternals.state.advancedAudioSettings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS };
          controllerInternals.state.attachState = "observing";
          controllerInternals.state.attachReason = "no_media";
          controllerInternals.trackedSessions.clear();
        }
      },
      {
        label: "missing settings",
        setup: () => {
          controllerInternals.state.enabled = true;
          controllerInternals.state.suspended = false;
          controllerInternals.state.advancedAudioSettings = null;
          controllerInternals.state.attachState = "observing";
          controllerInternals.state.attachReason = "no_media";
          controllerInternals.trackedSessions.clear();
        }
      },
      {
        label: "tracked sessions present",
        setup: () => {
          controllerInternals.state.enabled = true;
          controllerInternals.state.suspended = false;
          controllerInternals.state.advancedAudioSettings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS };
          controllerInternals.state.attachState = "observing";
          controllerInternals.state.attachReason = "no_media";
          controllerInternals.trackedSessions.clear();
          controllerInternals.trackedSessions.set({} as HTMLMediaElement, {
            session: createFakeSession() as unknown as MediaElementSessionHandle,
            lastTelemetry: makeTelemetry()
          });
        }
      },
      {
        label: "attach state mismatch",
        setup: () => {
          controllerInternals.state.enabled = true;
          controllerInternals.state.suspended = false;
          controllerInternals.state.advancedAudioSettings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS };
          controllerInternals.state.attachState = "attached";
          controllerInternals.state.attachReason = "no_media";
          controllerInternals.trackedSessions.clear();
        }
      },
      {
        label: "attach reason mismatch",
        setup: () => {
          controllerInternals.state.enabled = true;
          controllerInternals.state.suspended = false;
          controllerInternals.state.advancedAudioSettings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS };
          controllerInternals.state.attachState = "observing";
          controllerInternals.state.attachReason = "attach_failed";
          controllerInternals.trackedSessions.clear();
        }
      }
    ];

    for (const blockedCase of blockedCases) {
      refreshSpy.mockClear();
      controllerInternals.lastAutoRetryAt = 0;
      blockedCase.setup();
      nowSpy.mockReturnValueOnce(2_000);
      controllerInternals.syncLocationState();
      expect(refreshSpy, blockedCase.label).not.toHaveBeenCalled();
    }

    nowSpy.mockRestore();
  });

  it("switches cleanly between bridge waiting and attached states and keeps exact stream status payloads", () => {
    const controller = new AutoBoosterController();
    const internal = controller as unknown as {
      state: {
        tabId: number | null;
        scope: "global" | "site" | null;
        enabled: boolean;
        gainPercent: number;
        attachState: "idle" | "observing" | "awaiting_user_gesture" | "attached" | "failed";
        attachReason?: "no_media" | "autoplay_blocked" | "attach_failed";
        activeStrategy: "none" | "media_element" | "web_audio_bridge" | "hybrid";
        lastError?: LocalizedMessage;
      };
      bridgeStatus: BridgeStatusPayload;
      handleBridgeStatusEvent(event: Event): void;
      reportStatus(): void;
      reportAttachFailure(): void;
    };

    internal.state = {
      ...internal.state,
      tabId: 7,
      scope: "site",
      enabled: true,
      gainPercent: 220,
      attachState: "observing",
      attachReason: "no_media",
      activeStrategy: "none",
      lastError: undefined
    };

    internal.handleBridgeStatusEvent(
      createBridgeStatusEvent({
        enabled: true,
        suspended: false,
        scope: "site",
        attachState: "awaiting_user_gesture",
        attachReason: "autoplay_blocked",
        activeStrategy: "none",
        audioContextState: "suspended",
        autoplayPolicy: "disallowed",
        audioContextCount: 1,
        attachedNodeCount: 0,
        currentUrl: "https://youtube.com/watch?v=1"
      })
    );
    expect(controller.getDebugState()).toMatchObject({
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAwaitingGesture" }
    });

    runtimeSendMessage.mockClear();
    internal.handleBridgeStatusEvent(
      createBridgeStatusEvent({
        enabled: true,
        suspended: false,
        scope: "site",
        attachState: "attached",
        attachReason: undefined,
        activeStrategy: "web_audio_bridge",
        audioContextState: "running",
        autoplayPolicy: "allowed",
        audioContextCount: 1,
        attachedNodeCount: 2,
        currentUrl: "https://youtube.com/watch?v=1"
      })
    );
    expect(controller.getDebugState()).toMatchObject({
      attachState: "attached",
      attachReason: undefined,
      lastError: undefined
    });

    internal.reportStatus();
    internal.state.attachState = "failed";
    internal.state.attachReason = "attach_failed";
    internal.state.lastError = { key: "errorAutoAttachFailed" };
    internal.reportAttachFailure();

    expect(runtimeSendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE",
        payload: expect.objectContaining({
          streamState: "active",
          engineStatus: "ready",
          autoAttachState: "attached",
          autoAttachReason: undefined
        })
      })
    );
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: "AUTO_SESSION_ATTACH_FAILED",
        payload: expect.objectContaining({
          streamState: "error",
          engineStatus: "error",
          autoAttachState: "failed",
          autoAttachReason: "attach_failed"
        })
      })
    );
  });

  it("keeps waiting and failed attach states stable and reports exact status/failure payloads", async () => {
    const controller = new AutoBoosterController();
    (document as Document).title = "";
    runtimeSendMessage.mockClear();

    const internal = controller as unknown as {
      state: {
        tabId: number | null;
        scope: "global" | "site" | null;
        enabled: boolean;
        attachState: "awaiting_user_gesture" | "failed" | "attached";
        attachReason?: "autoplay_blocked" | "source_conflict";
        gainPercent: number;
        lastError?: LocalizedMessage;
      };
      syncAttachState(): void;
      reportStatus(): void;
      reportAttachFailure(): void;
    };

    internal.state = {
      ...internal.state,
      tabId: 7,
      scope: null,
      enabled: true,
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked",
      gainPercent: 220,
      lastError: { key: "errorAutoAwaitingGesture" }
    };
    internal.syncAttachState();
    expect(controller.getDebugState()).toMatchObject({
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked"
    });

    internal.state.attachState = "failed";
    internal.state.attachReason = "source_conflict";
    internal.syncAttachState();
    expect(controller.getDebugState()).toMatchObject({
      attachState: "failed",
      attachReason: "source_conflict"
    });

    internal.state.attachState = "attached";
    internal.state.attachReason = undefined;
    internal.reportStatus();
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(
      1,
      {
        type: "AUTO_SESSION_STATUS_UPDATE",
        payload: expect.objectContaining({
          tabId: 7,
          title: "Untitled tab",
          autoBoosterScope: undefined,
          streamState: "active",
          engineStatus: "ready"
        })
      }
    );

    internal.state.attachState = "failed";
    internal.state.attachReason = "source_conflict";
    internal.state.lastError = { key: "errorAutoSourceConflict" };
    internal.reportAttachFailure();
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(
      2,
      {
        type: "AUTO_SESSION_ATTACH_FAILED",
        payload: expect.objectContaining({
          tabId: 7,
          title: "Untitled tab",
          autoBoosterScope: undefined,
          autoAttachState: "failed",
          autoAttachReason: "source_conflict",
          streamState: "error",
          engineStatus: "error",
          lastError: { key: "errorAutoSourceConflict" }
        })
      }
    );
  });

  it("uses localized and literal untitled fallbacks plus exact engine metadata in status payloads", () => {
    const controller = new AutoBoosterController();
    (document as Document).title = "";
    i18nGetMessage.mockImplementation((key: string) => {
      if (key === "tabUntitled") {
        return "Localized untitled";
      }

      return "";
    });
    runtimeSendMessage.mockClear();
    (
      controller as unknown as {
        state: {
          tabId: number | null;
          attachState: "attached" | "failed";
          attachReason?: "attach_failed";
        };
        reportStatus: () => void;
        reportAttachFailure: () => void;
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            tabId: number | null;
            attachState: "idle" | "attached" | "failed";
            attachReason?: "attach_failed";
          };
        }
      ).state,
      tabId: 7,
      attachState: "attached"
    };

    (controller as unknown as { reportStatus: () => void }).reportStatus();

    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload: expect.objectContaining({
        title: "Localized untitled",
        engineStatus: "ready",
        engineLane: "auto_media_element"
      })
    });

    runtimeSendMessage.mockClear();
    i18nGetMessage.mockReturnValue("");
    (
      controller as unknown as {
        state: {
          tabId: number | null;
          attachState: "attached" | "failed";
          attachReason?: "attach_failed";
        };
      }
    ).state.attachState = "failed";
    (
      controller as unknown as {
        state: {
          tabId: number | null;
          attachState: "attached" | "failed";
          attachReason?: "attach_failed";
        };
      }
    ).state.attachReason = "attach_failed";

    (controller as unknown as { reportAttachFailure: () => void }).reportAttachFailure();

    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_ATTACH_FAILED",
      payload: expect.objectContaining({
        title: "Untitled tab",
        engineStatus: "error",
        engineLane: "auto_media_element"
      })
    });
  });

  it("prefers the live document title for attach-failure payloads instead of the untitled fallbacks", () => {
    const controller = new AutoBoosterController();
    Object.defineProperty(document, "title", {
      configurable: true,
      value: "Live stream title"
    });
    i18nGetMessage.mockReturnValue("Localized untitled");
    runtimeSendMessage.mockClear();

    (
      controller as unknown as {
        state: {
          tabId: number | null;
          attachState: "idle" | "attached" | "failed";
          attachReason?: "attach_failed";
        };
        reportAttachFailure(): void;
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            tabId: number | null;
            attachState: "idle" | "attached" | "failed";
            attachReason?: "attach_failed";
          };
        }
      ).state,
      tabId: 7,
      attachState: "failed",
      attachReason: "attach_failed"
    };

    (controller as unknown as { reportAttachFailure(): void }).reportAttachFailure();

    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_ATTACH_FAILED",
      payload: expect.objectContaining({
        title: "Live stream title"
      })
    });
  });

  it("keeps exact disabled and media-element strategy state transitions in syncAttachState", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();
    const internal = controller as unknown as {
      state: {
        enabled: boolean;
        attachState: "idle" | "observing" | "attached" | "awaiting_user_gesture" | "failed";
        attachReason?: "no_media" | "autoplay_blocked" | "attach_failed";
        activeStrategy: "none" | "media_element" | "web_audio_bridge" | "hybrid";
      };
      trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      syncAttachState(): void;
    };

    await controller.configure(makePayload());

    internal.state.enabled = false;
    internal.state.attachState = "attached";
    internal.state.attachReason = "no_media";
    internal.state.activeStrategy = "hybrid";
    internal.syncAttachState();
    expect(internal.state).toMatchObject({
      attachState: "idle",
      attachReason: undefined,
      activeStrategy: "none"
    });

    internal.state.enabled = true;
    internal.state.attachState = "observing";
    internal.state.attachReason = "no_media";
    internal.state.activeStrategy = "none";
    internal.trackedSessions.clear();
    internal.trackedSessions.set(fakeMediaElement, {
      session: fakeSession,
      lastTelemetry: makeTelemetry()
    });
    internal.syncAttachState();

    expect(internal.state).toMatchObject({
      attachState: "attached",
      attachReason: undefined,
      activeStrategy: "media_element"
    });
  });

  it("does not recreate media sessions for already processed elements", async () => {
    const fakeSession = createFakeSession();
    const createSpy = vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    createSpy.mockClear();

    await (controller as unknown as { scanForMediaElements(): Promise<void> }).scanForMediaElements();

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("preserves prior debug hints when a media-session error omits debug state and still classifies generic media failures as attach_failed", async () => {
    vi.spyOn(MediaElementSession, "create").mockRejectedValue(
      new MediaElementSessionError("attach_failed", "generic media failure")
    );
    const controller = new AutoBoosterController();
    (
      controller as unknown as {
        state: {
          tabId: number | null;
          scope: "global" | "site" | null;
          enabled: boolean;
          suspended: boolean;
          gainPercent: number;
          advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
          attachState: "idle" | "observing" | "attached" | "failed" | "awaiting_user_gesture";
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            tabId: number | null;
            scope: "global" | "site" | null;
            enabled: boolean;
            suspended: boolean;
            gainPercent: number;
            advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
            attachState: "idle" | "observing" | "attached" | "failed" | "awaiting_user_gesture";
          };
        }
      ).state,
      tabId: 7,
      scope: "site",
      enabled: true,
      suspended: false,
      gainPercent: 220,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      attachState: "observing"
    };
    (
      controller as unknown as {
        lastAudioContextState: AudioContextState | "none";
        lastAutoplayPolicy?: string;
      }
    ).lastAudioContextState = "running";
    (
      controller as unknown as {
        lastAudioContextState: AudioContextState | "none";
        lastAutoplayPolicy?: string;
      }
    ).lastAutoplayPolicy = "allowed";

    await (controller as unknown as { scanForMediaElements: () => Promise<void> }).scanForMediaElements();

    expect(controller.getDebugState()).toMatchObject({
      attachState: "failed",
      attachReason: "attach_failed",
      audioContextState: "running",
      autoplayPolicy: "allowed",
      lastError: { key: "errorAutoAttachFailed" },
      lastTechnicalError: "generic media failure"
    });
    expect(documentElementAppendChild).not.toHaveBeenCalled();
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_ATTACH_FAILED",
      payload: expect.objectContaining({
        engineLane: "auto_media_element",
        streamState: "error"
      })
    });
  });

  it("ignores gesture retries when the lane is no longer waiting for interaction", async () => {
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ enabled: false }));
    runtimeSendMessage.mockClear();
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          attachState: "attached" | "observing";
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            attachState: "idle" | "attached" | "observing";
          };
        }
      ).state,
      enabled: true,
      suspended: false,
      attachState: "attached"
    };

    await (controller as unknown as { handleGestureRetry: () => Promise<void> }).handleGestureRetry();

    expect(runtimeSendMessage).not.toHaveBeenCalled();
    expect(controller.getDebugState().attachState).toBe("attached");
  });

  it("arms gesture retry listeners only once and forwards the page gesture callback", async () => {
    const controller = new AutoBoosterController();
    const handleGestureRetrySpy = vi.spyOn(
      controller as unknown as { handleGestureRetry: () => Promise<void> },
      "handleGestureRetry"
    );

    (controller as unknown as { armGestureRetry: () => void }).armGestureRetry();
    (controller as unknown as { armGestureRetry: () => void }).armGestureRetry();

    expect(windowAddEventListener).toHaveBeenCalledTimes(3);
    expect(windowAddEventListener.mock.calls.map((call) => call[0])).toEqual([
      "pointerdown",
      "keydown",
      "touchstart"
    ]);
    for (const call of windowAddEventListener.mock.calls) {
      expect(call[2]).toEqual(
        expect.objectContaining({ capture: true, once: true, signal: expect.any(AbortSignal) })
      );
    }
    const retryCallback = windowAddEventListener.mock.calls[0][1] as () => void;
    retryCallback();
    await Promise.resolve();

    expect(handleGestureRetrySpy).toHaveBeenCalledTimes(1);
  });

  it("preserves prior bridge errors until attachment succeeds and disarms gesture retry exactly once", () => {
    const controller = new AutoBoosterController();
    const controllerInternals = controller as unknown as {
      state: {
        enabled: boolean;
        attachState: "idle" | "observing" | "attached" | "awaiting_user_gesture" | "failed";
        attachReason?: "no_media" | "autoplay_blocked" | "attach_failed";
        lastError?: LocalizedMessage;
      };
      lastTechnicalError?: string;
      gestureRetryAbortController: AbortController | null;
      armGestureRetry(): void;
      handleBridgeStatusEvent(event: Event): void;
    };

    controllerInternals.state.enabled = true;
    controllerInternals.state.attachState = "awaiting_user_gesture";
    controllerInternals.state.attachReason = "autoplay_blocked";
    controllerInternals.state.lastError = { key: "errorAutoAwaitingGesture" };
    controllerInternals.lastTechnicalError = "previous error";
    controllerInternals.armGestureRetry();

    const abortSpy = vi.spyOn(controllerInternals.gestureRetryAbortController as AbortController, "abort");

    controllerInternals.handleBridgeStatusEvent(
      createBridgeStatusEvent({
        enabled: true,
        suspended: false,
        scope: "global",
        attachState: "failed",
        attachReason: "attach_failed",
        activeStrategy: "none",
        audioContextState: "running",
        autoplayPolicy: "allowed",
        audioContextCount: 1,
        attachedNodeCount: 0,
        currentUrl: "https://youtube.com/watch?v=1"
      })
    );

    expect(controller.getDebugState()).toMatchObject({
      lastTechnicalError: "previous error",
      lastError: { key: "errorAutoAwaitingGesture" }
    });
    expect(abortSpy).not.toHaveBeenCalled();

    controllerInternals.handleBridgeStatusEvent(
      createBridgeStatusEvent({
        enabled: true,
        suspended: false,
        scope: "global",
        attachState: "attached",
        attachReason: undefined,
        activeStrategy: "web_audio_bridge",
        audioContextState: "running",
        autoplayPolicy: "allowed",
        audioContextCount: 1,
        attachedNodeCount: 1,
        currentUrl: "https://youtube.com/watch?v=1",
        lastTechnicalError: "fresh error"
      })
    );

    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(controllerInternals.gestureRetryAbortController).toBeNull();
    expect(controller.getDebugState()).toMatchObject({
      attachState: "attached",
      lastError: undefined,
      lastTechnicalError: "fresh error"
    });
  });

  it("stops gesture retry processing immediately when the lane is suspended", async () => {
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ enabled: false }));
    runtimeSendMessage.mockClear();
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          attachState: "awaiting_user_gesture";
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            attachState: "idle" | "awaiting_user_gesture";
          };
        }
      ).state,
      enabled: true,
      suspended: true,
      attachState: "awaiting_user_gesture"
    };

    await (controller as unknown as { handleGestureRetry: () => Promise<void> }).handleGestureRetry();

    expect(runtimeSendMessage).not.toHaveBeenCalled();
  });

  it("returns to observing/no_media after a gesture retry when no media can be attached", async () => {
    const controller = new AutoBoosterController();
    documentQuerySelectorAll.mockReturnValue([]);
    runtimeSendMessage.mockClear();
    (
      controller as unknown as {
        state: {
          enabled: boolean;
          suspended: boolean;
          tabId: number | null;
          attachState: "awaiting_user_gesture";
          attachReason?: "autoplay_blocked" | "no_media";
          lastError?: LocalizedMessage;
        };
        lastTechnicalError?: string;
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            enabled: boolean;
            suspended: boolean;
            tabId: number | null;
            attachState: "idle" | "awaiting_user_gesture";
            attachReason?: "autoplay_blocked" | "no_media";
            lastError?: LocalizedMessage;
          };
          lastTechnicalError?: string;
        }
      ).state,
      enabled: true,
      suspended: false,
      tabId: 7,
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAwaitingGesture" }
    };
    (
      controller as unknown as {
        lastTechnicalError?: string;
      }
    ).lastTechnicalError = "blocked";

    await (controller as unknown as { handleGestureRetry: () => Promise<void> }).handleGestureRetry();

    expect(controller.getDebugState()).toMatchObject({
      attachState: "observing",
      attachReason: "no_media",
      lastError: undefined,
      lastTechnicalError: undefined
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload: expect.objectContaining({
        autoAttachState: "observing",
        autoAttachReason: "no_media"
      })
    });
  });

  it("prefers danger and none warnings and swallows runtime message failures", async () => {
    const fakeSession = createFakeSession();
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());
    fakeSession.sampleTelemetry.mockReset();
    fakeSession.sampleTelemetry
      .mockReturnValueOnce(
        makeTelemetry("danger", {
          protectorActionDb: 9.4,
          clipEvents: 4,
          clipPeak: 0.92,
          outputPeak: 0.66
        })
      )
      .mockReturnValue(
        makeTelemetry("none", {
          protectorActionDb: 0.4,
          clipEvents: 0,
          clipPeak: 0,
          outputPeak: 0.18
        })
      );
    runtimeSendMessage.mockRejectedValueOnce(new Error("worker asleep"));
    const telemetryTick = [...intervalCallbacks.values()].at(-1);
    telemetryTick?.();
    runtimeSendMessage.mockResolvedValue(undefined);
    telemetryTick?.();

    expect(controller.getDebugState().lastLevel).toBe(0.32);
    expect(fakeSession.sampleTelemetry).toHaveBeenCalledTimes(2);
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_LEVEL_UPDATE",
        payload: expect.objectContaining({
          warning: "danger"
        })
      })
    );
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_LEVEL_UPDATE",
        payload: expect.objectContaining({
          warning: "none"
        })
      })
    );
  });

  it("uses the newer bridge telemetry timestamp when it exceeds the wall clock", () => {
    const controller = new AutoBoosterController();
    const controllerInternals = controller as unknown as {
      state: {
        enabled: boolean;
        suspended: boolean;
        tabId: number | null;
        attachState: "idle" | "observing" | "attached" | "awaiting_user_gesture" | "failed";
      };
      bridgeTelemetry: {
        activeStrategy: "none" | "web_audio_bridge";
        level: number;
        warning: LevelWarning;
        metrics: DspRuntimeMetrics;
        audioContextCount: number;
        attachedNodeCount: number;
        lastTelemetryAt: number;
      };
      publishTelemetry(): void;
    };
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(500);

    controllerInternals.state.enabled = true;
    controllerInternals.state.suspended = false;
    controllerInternals.state.tabId = 7;
    controllerInternals.state.attachState = "attached";
    controllerInternals.bridgeTelemetry = {
      activeStrategy: "web_audio_bridge",
      level: 0.57,
      warning: "high",
      metrics: {
        protectorActionDb: 3.2,
        clipEvents: 2,
        clipPeak: 0.61,
        protectionBypassed: false,
        inputPeak: 0.57,
        outputPeak: 0.42
      },
      audioContextCount: 1,
      attachedNodeCount: 1,
      lastTelemetryAt: 750
    };
    runtimeSendMessage.mockClear();

    controllerInternals.publishTelemetry();

    expect(controller.getDebugState()).toMatchObject({
      lastTelemetryAt: 750,
      lastLevel: 0.57
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_LEVEL_UPDATE",
        payload: expect.objectContaining({
          level: 0.57,
          warning: "high"
        })
      })
    );

    nowSpy.mockRestore();
  });

  it("keeps silent early returns for status/failure reporting when tab id is missing", async () => {
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ enabled: false }));
    runtimeSendMessage.mockClear();

    const controllerWithState = controller as unknown as {
      state: {
        tabId: number | null;
      };
      reportStatus: () => void;
      reportAttachFailure: () => void;
    };

    controllerWithState.state.tabId = null;
    controllerWithState.reportStatus();
    controllerWithState.reportAttachFailure();

    expect(runtimeSendMessage).not.toHaveBeenCalled();
  });

  it("exposes toast visibility through the debug snapshot when requested", () => {
    const controller = new AutoBoosterController();
    expect(controller.getDebugState(true)).toMatchObject({
      toastVisible: true,
      frameCount: 1,
      readyFrameCount: 1
    });
  });

  it("merges bridge state into a hybrid lane and exposes bridge counts in the debug snapshot", async () => {
    const fakeSession = createFakeSession({
      sampleTelemetry: vi.fn().mockReturnValue(
        makeTelemetry("none", {
          protectorActionDb: 1.2,
          clipEvents: 1,
          clipPeak: 0.24,
          outputPeak: 0.35
        })
      )
    });
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const controller = new AutoBoosterController();
    const controllerInternals = controller as unknown as {
      handleBridgeStatusEvent(event: Event): void;
      handleBridgeTelemetryEvent(event: Event): void;
      publishTelemetry(): void;
    };

    await controller.configure(makePayload());
    runtimeSendMessage.mockClear();

    controllerInternals.handleBridgeStatusEvent(
      createBridgeStatusEvent({
        enabled: true,
        suspended: false,
        scope: "global",
        attachState: "attached",
        activeStrategy: "web_audio_bridge",
        audioContextState: "running",
        autoplayPolicy: "allowed",
        audioContextCount: 2,
        attachedNodeCount: 3,
        currentUrl: "https://youtube.com/watch?v=1"
      })
    );
    controllerInternals.handleBridgeTelemetryEvent(
      createBridgeTelemetryEvent({
        activeStrategy: "web_audio_bridge",
        level: 0.81,
        warning: "high",
        metrics: {
          protectorActionDb: 4.8,
          clipEvents: 2,
          clipPeak: 0.92,
          protectionBypassed: true,
          outputPeak: 0.74
        },
        audioContextCount: 2,
        attachedNodeCount: 3,
        lastTelemetryAt: 123
      })
    );
    controllerInternals.publishTelemetry();

    expect(controller.getDebugState(true)).toMatchObject({
      activeStrategy: "hybrid",
      attachedElementCount: 4,
      bridgeContextCount: 2,
      bridgeAttachedNodeCount: 3,
      lastLevel: 0.81,
      toastVisible: true
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_LEVEL_UPDATE",
        payload: expect.objectContaining({
          warning: "high",
          clipEvents: 3,
          protectionBypassed: true,
          outputPeak: 0.74
        })
      })
    );
  });

  it("removes bridge listeners on destroy and swallows tracked-session stop failures", async () => {
    const fakeSession = createFakeSession({
      stop: vi.fn().mockRejectedValue(new Error("stop failed"))
    });
    vi.spyOn(MediaElementSession, "create").mockResolvedValue(fakeSession as never);
    const removeEventListener = vi.fn();
    (window as unknown as Window & { removeEventListener: typeof removeEventListener }).removeEventListener =
      removeEventListener;

    const controller = new AutoBoosterController();
    await controller.configure(makePayload());

    await expect(controller.destroy()).resolves.toBeUndefined();
    expect(removeEventListener).toHaveBeenCalledWith(BRIDGE_STATUS_EVENT, expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith(BRIDGE_TELEMETRY_EVENT, expect.any(Function));
    expect(fakeSession.stop).toHaveBeenCalledTimes(1);
  });

  it("dedupes pending retry listeners and periodically requeues observing rescans on a stable url", () => {
    const controller = new AutoBoosterController();
    const controllerInternals = controller as unknown as {
      state: {
        enabled: boolean;
        suspended: boolean;
        advancedAudioSettings: AutoBoosterConfigPayload["advancedAudioSettings"] | null;
        attachState: string;
        attachReason?: string;
      };
      pendingMediaRetryControllers: Map<HTMLMediaElement, AbortController>;
      lastLocationHref: string;
      lastAutoRetryAt: number;
      ensurePendingMediaRetryListeners(mediaElement: HTMLMediaElement): void;
      syncLocationState(): void;
      runRefreshMediaTracking(): Promise<void>;
    };
    const mediaWithoutListeners = {
      paused: true,
      ended: false,
      readyState: 0,
      currentTime: 0,
      played: { length: 0 } as TimeRanges
    } as unknown as HTMLMediaElement;
    const refreshSpy = vi.fn(async () => undefined);
    const nowSpy = vi.spyOn(Date, "now");

    controllerInternals.ensurePendingMediaRetryListeners(mediaWithoutListeners);
    expect(controllerInternals.pendingMediaRetryControllers.size).toBe(0);

    controllerInternals.ensurePendingMediaRetryListeners(fakeMediaElement);
    controllerInternals.ensurePendingMediaRetryListeners(fakeMediaElement);
    expect(fakeMediaElement.addEventListener).toHaveBeenCalledTimes(6);

    controllerInternals.state.enabled = true;
    controllerInternals.state.suspended = false;
    controllerInternals.state.advancedAudioSettings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS };
    controllerInternals.state.attachState = "observing";
    controllerInternals.state.attachReason = "no_media";
    controllerInternals.lastLocationHref = window.location.href;
    controllerInternals.lastAutoRetryAt = 0;
    controllerInternals.runRefreshMediaTracking = refreshSpy;

    nowSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(1_200).mockReturnValueOnce(1_600);
    controllerInternals.syncLocationState();
    controllerInternals.syncLocationState();
    controllerInternals.syncLocationState();

    expect(refreshSpy).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it("only retries pending media listeners when the controller is active and the element becomes ready", () => {
    const controller = new AutoBoosterController();
    const readyCallbacks = new Map<string, () => void>();
    const notReadyCallbacks = new Map<string, () => void>();
    const readyMediaElement = {
      paused: false,
      ended: false,
      currentSrc: "https://cdn.example.com/live.mp4",
      srcObject: null,
      readyState: 2,
      currentTime: 1,
      played: { length: 1 } as TimeRanges,
      addEventListener: vi.fn((eventName: string, callback: () => void, options?: AddEventListenerOptions) => {
        readyCallbacks.set(eventName, callback);
        expect(options).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
      })
    } as unknown as HTMLMediaElement;
    const notReadyMediaElement = {
      paused: true,
      ended: false,
      currentSrc: "https://cdn.example.com/later.mp4",
      srcObject: null,
      readyState: 0,
      currentTime: 0,
      played: { length: 0 } as TimeRanges,
      addEventListener: vi.fn((eventName: string, callback: () => void) => {
        notReadyCallbacks.set(eventName, callback);
      })
    } as unknown as HTMLMediaElement;
    const controllerInternals = controller as unknown as {
      state: {
        enabled: boolean;
        suspended: boolean;
      };
      pendingMediaRetryControllers: Map<HTMLMediaElement, AbortController>;
      ensurePendingMediaRetryListeners(mediaElement: HTMLMediaElement): void;
      runRefreshMediaTracking(): Promise<void>;
    };
    const refreshSpy = vi.fn(async () => undefined);

    controllerInternals.runRefreshMediaTracking = refreshSpy;
    controllerInternals.ensurePendingMediaRetryListeners(readyMediaElement);
    controllerInternals.ensurePendingMediaRetryListeners(notReadyMediaElement);

    expect([...readyCallbacks.keys()]).toEqual([
      "play",
      "playing",
      "canplay",
      "loadedmetadata",
      "timeupdate",
      "volumechange"
    ]);

    controllerInternals.state.enabled = false;
    controllerInternals.state.suspended = false;
    readyCallbacks.get("play")?.();
    expect(refreshSpy).not.toHaveBeenCalled();

    controllerInternals.state.enabled = true;
    controllerInternals.state.suspended = true;
    readyCallbacks.get("playing")?.();
    expect(refreshSpy).not.toHaveBeenCalled();

    controllerInternals.state.suspended = false;
    notReadyCallbacks.get("play")?.();
    expect(refreshSpy).not.toHaveBeenCalled();

    readyCallbacks.get("canplay")?.();
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(controllerInternals.pendingMediaRetryControllers.has(readyMediaElement)).toBe(false);
    expect(controllerInternals.pendingMediaRetryControllers.has(notReadyMediaElement)).toBe(true);
  });

  it("aborts pending retry listeners in bulk and preserves in-document tracked entries during pruning", () => {
    const controller = new AutoBoosterController();
    const trackedSession = createFakeSession();
    const retainedMediaElement = { id: "retained" } as unknown as HTMLMediaElement;
    const retainedPendingMediaElement = { id: "retained-pending" } as unknown as HTMLMediaElement;
    const detachedPendingMediaElement = { id: "detached-pending" } as unknown as HTMLMediaElement;
    const retainedAbortController = new AbortController();
    const detachedAbortController = new AbortController();
    const retainedAbortSpy = vi.spyOn(retainedAbortController, "abort");
    const detachedAbortSpy = vi.spyOn(detachedAbortController, "abort");
    const controllerInternals = controller as unknown as {
      trackedSessions: Map<HTMLMediaElement, TrackedSessionEntry>;
      pendingMediaRetryControllers: Map<HTMLMediaElement, AbortController>;
      pruneDetachedSessions(): void;
      clearAllPendingMediaRetryListeners(): void;
    };

    controllerInternals.trackedSessions.set(retainedMediaElement, {
      session: trackedSession,
      lastTelemetry: makeTelemetry()
    });
    controllerInternals.pendingMediaRetryControllers.set(retainedPendingMediaElement, retainedAbortController);
    controllerInternals.pendingMediaRetryControllers.set(detachedPendingMediaElement, detachedAbortController);
    documentContains.mockImplementation((node: Node) => {
      return node === retainedMediaElement || node === retainedPendingMediaElement;
    });

    controllerInternals.pruneDetachedSessions();

    expect(trackedSession.stop).not.toHaveBeenCalled();
    expect(controllerInternals.trackedSessions.has(retainedMediaElement)).toBe(true);
    expect(retainedAbortSpy).not.toHaveBeenCalled();
    expect(detachedAbortSpy).toHaveBeenCalledTimes(1);
    expect(controllerInternals.pendingMediaRetryControllers.has(detachedPendingMediaElement)).toBe(false);

    retainedAbortSpy.mockClear();
    controllerInternals.clearAllPendingMediaRetryListeners();

    expect(retainedAbortSpy).toHaveBeenCalledTimes(1);
    expect(controllerInternals.pendingMediaRetryControllers.size).toBe(0);
  });

  it("processes registered bridge listeners for invalid, waiting and attached bridge states", async () => {
    const controller = new AutoBoosterController();
    const dispatchEvent = vi.fn();
    (window as unknown as Window & { dispatchEvent: typeof dispatchEvent }).dispatchEvent = dispatchEvent;

    await controller.configure(makePayload());

    const statusListener = windowAddEventListener.mock.calls.find(([eventName]) => eventName === BRIDGE_STATUS_EVENT)?.[1] as EventListener;
    const telemetryListener = windowAddEventListener.mock.calls.find(([eventName]) => eventName === BRIDGE_TELEMETRY_EVENT)?.[1] as EventListener;

    runtimeSendMessage.mockClear();
    statusListener(new CustomEvent(BRIDGE_STATUS_EVENT, { detail: { source: "other" } }));
    telemetryListener(new CustomEvent(BRIDGE_TELEMETRY_EVENT, { detail: { source: "other" } }));
    expect(runtimeSendMessage).not.toHaveBeenCalled();

    statusListener(
      createBridgeStatusEvent({
        enabled: true,
        suspended: false,
        scope: "global",
        attachState: "awaiting_user_gesture",
        attachReason: "autoplay_blocked",
        activeStrategy: "none",
        audioContextState: "suspended",
        autoplayPolicy: "disallowed",
        audioContextCount: 1,
        attachedNodeCount: 0,
        currentUrl: "https://youtube.com/watch?v=1"
      })
    );
    expect(controller.getDebugState()).toMatchObject({
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAwaitingGesture" }
    });

    statusListener(
      createBridgeStatusEvent({
        enabled: true,
        suspended: false,
        scope: "global",
        attachState: "attached",
        activeStrategy: "web_audio_bridge",
        audioContextState: "running",
        autoplayPolicy: "allowed",
        audioContextCount: 1,
        attachedNodeCount: 1,
        currentUrl: "https://youtube.com/watch?v=1"
      })
    );
    telemetryListener(
      createBridgeTelemetryEvent({
        activeStrategy: "web_audio_bridge",
        level: 0.91,
        warning: "high",
        metrics: {
          protectorActionDb: 5,
          clipEvents: 2,
          clipPeak: 0.8,
          protectionBypassed: false,
          outputPeak: 0.72
        },
        audioContextCount: 1,
        attachedNodeCount: 1,
        lastTelemetryAt: 456
      })
    );

    expect(controller.getDebugState()).toMatchObject({
      attachState: "attached",
      activeStrategy: "web_audio_bridge",
      bridgeContextCount: 1,
      bridgeAttachedNodeCount: 1,
      lastLevel: 0.91
    });
    expect(dispatchEvent).toHaveBeenCalled();
  });

  it("keeps the higher telemetry snapshot and exact sync fallbacks across bridge edge cases", async () => {
    const controller = new AutoBoosterController();
    const controllerInternals = controller as unknown as {
      state: {
        enabled: boolean;
        attachState: "idle" | "observing" | "attached" | "awaiting_user_gesture" | "failed";
        attachReason?: "no_media" | "autoplay_blocked" | "attach_failed";
        activeStrategy: "none" | "media_element" | "web_audio_bridge" | "hybrid";
      };
      bridgeStatus: BridgeStatusPayload;
      lastTelemetryAt: number | null;
      lastLevel: number;
      handleBridgeTelemetryEvent(event: Event): void;
      syncAttachState(): void;
    };

    await controller.configure(makePayload({ enabled: false }));
    controllerInternals.lastTelemetryAt = 800;
    controllerInternals.lastLevel = 0.88;
    controllerInternals.handleBridgeTelemetryEvent(
      createBridgeTelemetryEvent({
        activeStrategy: "web_audio_bridge",
        level: 0.41,
        warning: "none",
        metrics: {
          protectorActionDb: 0.8,
          clipEvents: 0,
          clipPeak: 0.14,
          protectionBypassed: false,
          outputPeak: 0.19
        },
        audioContextCount: 1,
        attachedNodeCount: 1,
        lastTelemetryAt: 650
      })
    );

    expect(controller.getDebugState()).toMatchObject({
      lastTelemetryAt: 800,
      lastLevel: 0.88
    });

    controllerInternals.state.enabled = true;
    controllerInternals.state.attachState = "observing";
    controllerInternals.state.attachReason = "no_media";
    controllerInternals.state.activeStrategy = "none";
    controllerInternals.bridgeStatus = {
      ...controllerInternals.bridgeStatus,
      attachState: "attached",
      activeStrategy: "none",
      attachReason: undefined
    };
    controllerInternals.syncAttachState();
    expect(controller.getDebugState()).toMatchObject({
      attachState: "observing",
      attachReason: "no_media"
    });
    expect(controller.getDebugState()).not.toHaveProperty("activeStrategy");

    controllerInternals.bridgeStatus = {
      ...controllerInternals.bridgeStatus,
      attachState: "failed",
      activeStrategy: "web_audio_bridge",
      attachReason: undefined
    };
    controllerInternals.state.attachState = "failed";
    controllerInternals.state.attachReason = undefined;
    controllerInternals.syncAttachState();

    expect(controller.getDebugState()).toMatchObject({
      attachState: "failed",
      attachReason: "attach_failed"
    });
    expect(controller.getDebugState()).not.toHaveProperty("activeStrategy");
  });

  it("skips bridge listener binding when the page cannot register events", async () => {
    delete (window as unknown as { addEventListener?: typeof windowAddEventListener }).addEventListener;
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ enabled: false }));

    expect(
      (
        controller as unknown as {
          bridgeListenersBound: boolean;
        }
      ).bridgeListenersBound
    ).toBe(false);
    expect(windowAddEventListener).not.toHaveBeenCalled();
  });

  it("enters awaiting_user_gesture before session creation when playback exists but autoplay readiness is missing", async () => {
    vi.stubGlobal(
      "navigator",
      {
        userActivation: {
          isActive: false
        }
      } as unknown as Navigator
    );
    const autoplayBlockedMediaElement = {
      paused: false,
      ended: false,
      currentSrc: "https://cdn.example.com/ready.mp4",
      srcObject: null,
      readyState: 2,
      currentTime: 1,
      played: { length: 1 } as TimeRanges,
      addEventListener: vi.fn()
    } as unknown as HTMLMediaElement;
    const createSpy = vi.spyOn(MediaElementSession, "create");
    documentQuerySelectorAll.mockReturnValue([autoplayBlockedMediaElement]);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());

    expect(createSpy).not.toHaveBeenCalled();
    expect(controller.getDebugState()).toMatchObject({
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAwaitingGesture" }
    });
    expect(autoplayBlockedMediaElement.addEventListener).toHaveBeenCalled();
  });

  it("keeps the lane attached when a later element hits source_conflict after one session is already active", async () => {
    const firstSession = createFakeSession();
    const conflictingMediaElement = {
      ...fakeMediaElement,
      currentSrc: "https://cdn.example.com/other.mp4",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLMediaElement;
    const createSpy = vi.spyOn(MediaElementSession, "create");
    createSpy
      .mockResolvedValueOnce(firstSession as never)
      .mockRejectedValueOnce(new MediaElementSessionError("source_conflict", "other graph active"));
    documentQuerySelectorAll.mockReturnValue([fakeMediaElement, conflictingMediaElement]);
    const controller = new AutoBoosterController();

    await controller.configure(makePayload());

    expect(controller.getDebugState()).toMatchObject({
      attachState: "attached",
      attachedElementCount: 1
    });
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it("uses literal fallbacks when i18n is empty and stringifies generic attach failures", async () => {
    const controller = new AutoBoosterController();
    const controllerInternals = controller as unknown as {
      reportStatus(): void;
      postBridgeCommand(payload: { type: "disable"; payload: { tabId: number } }): void;
    };

    documentQuerySelectorAll = vi.fn(() => []);
    Object.defineProperty(document, "title", {
      configurable: true,
      value: ""
    });
    i18nGetMessage.mockReturnValue("");
    vi.spyOn(MediaElementSession, "create").mockRejectedValue("bridge exploded");

    await controller.configure(makePayload());
    expect(controller.getDebugState()).toMatchObject({
      attachState: "failed",
      attachReason: "attach_failed",
      lastTechnicalError: "bridge exploded"
    });

    runtimeSendMessage.mockClear();
    controllerInternals.reportStatus();
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_STATUS_UPDATE",
        payload: expect.objectContaining({
          title: "Untitled tab"
        })
      })
    );

    const originalCustomEvent = globalThis.CustomEvent;
    delete (window as unknown as { dispatchEvent?: (event: Event) => void }).dispatchEvent;
    controllerInternals.postBridgeCommand({
      type: "disable",
      payload: { tabId: 7 }
    });
    vi.stubGlobal("CustomEvent", undefined as unknown as typeof CustomEvent);
    (window as unknown as Window & { dispatchEvent?: (event: Event) => boolean }).dispatchEvent = vi.fn(() => true);
    controllerInternals.postBridgeCommand({
      type: "disable",
      payload: { tabId: 7 }
    });
    vi.stubGlobal("CustomEvent", originalCustomEvent);
  });
});
