import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { getDuckDuckGoFaviconUrl } from "../shared/domain";
import type {
  AutoBoosterConfigPayload,
  DspRuntimeMetrics,
  LevelWarning,
  LocalizedMessage
} from "../shared/types";
import { AutoBoosterController } from "./controller";
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
      lastTelemetryAt: null,
      lastLevel: 0,
      lastError: undefined,
      lastTechnicalError: undefined,
      currentUrl: "https://youtube.com/watch?v=1"
    });
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

  it("reports source conflicts, shows a toast and marks the tab as failed", async () => {
    vi.spyOn(MediaElementSession, "create").mockRejectedValue(
      new MediaElementSessionError("source_conflict", "already connected", {
        audioContextState: "running",
        autoplayPolicy: "allowed"
      })
    );
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ scope: "global" }));

    expect(controller.getDebugState()).toMatchObject({
      attachState: "failed",
      attachReason: "source_conflict",
      lastError: { key: "errorAutoSourceConflict" }
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_ATTACH_FAILED"
      })
    );
    expect(runtimeSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_SESSION_TOAST_REQUESTED"
      })
    );
    expect(documentElementAppendChild).toHaveBeenCalledTimes(1);
    expect(timeoutCallbacks).toHaveLength(1);
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

  it("returns to observing after a gesture retry and prunes detached sessions during rescans", async () => {
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

    expect(createSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(controller.getDebugState()).toMatchObject({
      attachState: "observing",
      attachReason: "no_media"
    });

    (
      controller as unknown as {
        trackedSessions: Map<HTMLMediaElement, { session: FakeSession; lastTelemetry: ReturnType<typeof makeTelemetry> }>;
        state: { attachState: "attached"; attachReason?: undefined };
      }
    ).trackedSessions.set(fakeMediaElement, {
      session: fakeSession,
      lastTelemetry: makeTelemetry()
    });
    (
      controller as unknown as {
        state: {
          attachState: "attached";
          attachReason?: undefined;
        };
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            attachState: "observing" | "attached";
            attachReason?: "no_media";
          };
        }
      ).state,
      attachState: "attached",
      attachReason: undefined
    };

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
        trackedSessions: Map<HTMLMediaElement, { session: FakeSession; lastTelemetry: ReturnType<typeof makeTelemetry> }>;
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
        trackedSessions: Map<HTMLMediaElement, { session: FakeSession; lastTelemetry: ReturnType<typeof makeTelemetry> }>;
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
        trackedSessions: Map<HTMLMediaElement, { session: FakeSession; lastTelemetry: ReturnType<typeof makeTelemetry> }>;
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

  it("keeps silent early returns for status/failure reporting and only toasts once per url", async () => {
    const controller = new AutoBoosterController();

    await controller.configure(makePayload({ enabled: false }));
    runtimeSendMessage.mockClear();

    const controllerWithState = controller as unknown as {
      state: {
        tabId: number | null;
        scope: "global" | "site" | null;
        attachReason?: "attach_failed";
      };
      reportStatus: () => void;
      reportAttachFailure: () => void;
      requestFailureToast: () => void;
    };

    controllerWithState.state.tabId = null;
    controllerWithState.reportStatus();
    controllerWithState.reportAttachFailure();

    expect(runtimeSendMessage).not.toHaveBeenCalled();

    const createdToast = {
      className: "",
      textContent: "",
      style: {},
      remove: vi.fn()
    };
    const createElementMock = vi.spyOn(document, "createElement").mockReturnValue(createdToast as never);

    controllerWithState.state.tabId = 7;
    controllerWithState.state.scope = "site";
    controllerWithState.requestFailureToast();
    expect(runtimeSendMessage).not.toHaveBeenCalled();

    controllerWithState.state.scope = "global";
    controllerWithState.state.attachReason = "attach_failed";
    controllerWithState.requestFailureToast();
    controllerWithState.requestFailureToast();

    expect(createElementMock).toHaveBeenCalledTimes(1);
    expect(createElementMock).toHaveBeenCalledWith("div");
    expect(createdToast.className).toBe("prism-auto-booster-toast");
    expect(createdToast.textContent).toBe(
      "Automatic booster could not hook this page. Use the manual booster from the popup."
    );
    expect(createdToast.style).toMatchObject({
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "2147483647",
      maxWidth: "360px",
      padding: "14px 16px",
      borderRadius: "16px",
      background: "linear-gradient(135deg, rgba(20,26,34,0.96), rgba(30,12,12,0.94))",
      border: "1px solid rgba(245,113,113,0.4)",
      boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
      color: "#f6f0eb",
      fontFamily: "\"Segoe UI\", sans-serif",
      fontSize: "13px",
      lineHeight: "1.45"
    });
    expect(runtimeSendMessage).toHaveBeenCalledTimes(1);
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_TOAST_REQUESTED",
      payload: { tabId: 7, reason: "attach_failed" }
    });
    expect(timeoutCallbacks).toHaveLength(1);

    timeoutCallbacks[0]?.();
    expect(createdToast.remove).toHaveBeenCalledTimes(1);
  });

  it("uses the fallback toast copy and attach_failed reason when i18n returns an empty message", () => {
    const controller = new AutoBoosterController();
    i18nGetMessage.mockReturnValue("");
    const createdToast = {
      className: "",
      textContent: "",
      style: {},
      remove: vi.fn()
    };
    vi.spyOn(document, "createElement").mockReturnValue(createdToast as never);
    (
      controller as unknown as {
        state: {
          tabId: number | null;
          scope: "global" | "site" | null;
          attachReason?: "attach_failed";
        };
        requestFailureToast: () => void;
      }
    ).state = {
      ...(
        controller as unknown as {
          state: {
            tabId: number | null;
            scope: "global" | "site" | null;
            attachReason?: "attach_failed";
          };
        }
      ).state,
      tabId: 7,
      scope: "global",
      attachReason: undefined
    };

    (controller as unknown as { requestFailureToast: () => void }).requestFailureToast();

    expect(createdToast.textContent).toBe(
      "Automatic booster could not hook this page. Use the manual booster from the popup."
    );
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "AUTO_SESSION_TOAST_REQUESTED",
      payload: { tabId: 7, reason: "attach_failed" }
    });
  });
});
