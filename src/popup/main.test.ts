// @vitest-environment happy-dom

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import type { CaptureSessionState, PopupTheme, WorkerState } from "../shared/types";

function makeState(overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    currentTab: {
      tabId: 7,
      title: "Extensions",
      url: "chrome://extensions",
      domain: "extensions",
      supported: false,
      preferredGainPercent: 100,
      hasStoredPreference: false,
      autoAttachState: "unsupported",
      autoAttachReason: "site_not_hookable"
    },
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
    autoBoosterMode: "off",
    globalAutoGainPercent: 100,
    hasGlobalPermission: true,
    sessions: [],
    generatedAt: 1,
    ...overrides
  };
}

function makeSession(overrides: Partial<CaptureSessionState> = {}): CaptureSessionState {
  return {
    tabId: 91,
    title: "Focus Stream",
    url: "https://example.com/watch",
    domain: "example.com",
    gainPercent: 175,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.26,
    warning: "none",
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.26,
    updatedAt: 1,
    ...overrides
  };
}
function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(turns = 6): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

describe("popup main theme integration", () => {
  let persistedTheme: PopupTheme;
  let setPopupThemeMock: ReturnType<typeof vi.fn>;
  let sendMessageSafeMock: ReturnType<typeof vi.fn>;
  let runtimeMessageListener: ((message: unknown) => void) | null;
  let captureExceptionSafeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();

    document.body.innerHTML = '<div id="app"></div>';
    runtimeMessageListener = null;
    persistedTheme = "dark";
    captureExceptionSafeMock = vi.fn();
    setPopupThemeMock = vi.fn(async (theme: PopupTheme) => {
      persistedTheme = theme;
      return theme;
    });
    sendMessageSafeMock = vi.fn(async (command: { type: string }) => {
      if (command.type === "GET_STATE") {
        return {
          ok: true,
          data: makeState()
        };
      }

      return {
        ok: true,
        data: null
      };
    });

    vi.doMock("../shared/messages", () => ({
      message: (key: string) => ({ key }),
      sendMessageSafe: sendMessageSafeMock
    }));

    vi.doMock("../shared/observability/sentry", () => ({
      initSentryForContext: vi.fn(),
      captureExceptionSafe: captureExceptionSafeMock
    }));

    vi.doMock("../shared/storage", () => ({
      SettingsRepository: class {
        async getPopupTheme(): Promise<PopupTheme> {
          return persistedTheme;
        }

        async setPopupTheme(theme: PopupTheme): Promise<PopupTheme> {
          return (setPopupThemeMock as (popupTheme: PopupTheme) => Promise<PopupTheme>)(theme);
        }
      }
    }));

    vi.doMock("../shared/ui-font-extension", () => ({
      ensureExtensionUiFontFaces: vi.fn()
    }));

    vi.stubGlobal(
      "chrome",
      {
        i18n: {
          getMessage: vi.fn(() => ""),
          getUILanguage: vi.fn(() => "en")
        },
        runtime: {
          onMessage: {
            addListener: vi.fn((listener: (message: unknown) => void) => {
              runtimeMessageListener = listener;
            })
          }
        }
      } as unknown as typeof chrome
    );

    vi.stubGlobal("requestAnimationFrame", ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Element.prototype.animate = vi.fn(() => ({
      cancel: vi.fn(),
      finished: Promise.resolve(),
      pause: vi.fn(),
      play: vi.fn()
    })) as unknown as typeof Element.prototype.animate;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function importPopupMain(): Promise<void> {
    await import("./main");
    await flushMicrotasks();
  }

  function getThemeButton(): HTMLButtonElement {
    const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-popup-theme']");

    if (!button) {
      throw new Error("Expected the popup theme button to be rendered.");
    }

    return button;
  }

  function getSessionMeterFill(): HTMLElement {
    const meterFill = document.querySelector<HTMLElement>("[data-role='session-meter-fill']");

    if (!meterFill) {
      throw new Error("Expected the popup session meter fill to be rendered.");
    }

    return meterFill;
  }
  it("boots with the persisted light theme already applied", async () => {
    persistedTheme = "light";

    await importPopupMain();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getThemeButton().dataset.popupThemeTarget).toBe("dark");
  });

  it("changes theme on the first click without replacing the toolbar button node", async () => {
    await importPopupMain();

    const themeButton = getThemeButton();
    const initialTitle = themeButton.title;

    themeButton.click();
    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(themeButton.isConnected).toBe(true);
    expect(getThemeButton()).toBe(themeButton);
    expect(themeButton.title).not.toBe(initialTitle);
    expect(themeButton.dataset.popupThemeTarget).toBe("dark");

    themeButton.click();
    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("dark");
    expect(getThemeButton()).toBe(themeButton);
    expect(themeButton.dataset.popupThemeTarget).toBe("light");
  });

  it("handles clicks that land directly on the toolbar svg icon", async () => {
    await importPopupMain();

    const themeButton = getThemeButton();
    const themeIcon = themeButton.querySelector<SVGElement>(".popup-toolbar__icon svg");

    if (!themeIcon) {
      throw new Error("Expected the popup theme icon SVG to be rendered.");
    }

    themeIcon.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getThemeButton()).toBe(themeButton);
    expect(themeButton.dataset.popupThemeTarget).toBe("dark");
  });

  it("keeps the final theme correct after five rapid clicks even if persistence is slow", async () => {
    const writes: Array<ReturnType<typeof createDeferred<PopupTheme>> & { theme: PopupTheme }> = [];
    setPopupThemeMock.mockImplementation((theme: PopupTheme) => {
      const write = {
        theme,
        ...createDeferred<PopupTheme>()
      };
      writes.push(write);
      return write.promise;
    });

    await importPopupMain();

    const themeButton = getThemeButton();

    for (let index = 0; index < 5; index += 1) {
      themeButton.click();
    }

    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getThemeButton()).toBe(themeButton);
    expect(setPopupThemeMock).toHaveBeenCalledTimes(1);
    expect(writes[0]?.theme).toBe("light");

    for (let index = 0; index < 4; index += 1) {
      writes[index].resolve(writes[index].theme);
      await flushMicrotasks();
      expect(writes.length).toBe(index + 2);
    }

    writes[4].resolve(writes[4].theme);
    await flushMicrotasks();

    expect(setPopupThemeMock.mock.calls.map(([theme]) => theme)).toEqual([
      "light",
      "dark",
      "light",
      "dark",
      "light"
    ]);
    expect(document.documentElement.dataset.popupTheme).toBe("light");
  });

  it("survives a rejected persistence write and still toggles again on the next click", async () => {
    setPopupThemeMock
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockImplementation(async (theme: PopupTheme) => {
        persistedTheme = theme;
        return theme;
      });

    await importPopupMain();

    const themeButton = getThemeButton();
    themeButton.click();
    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(captureExceptionSafeMock).toHaveBeenCalledTimes(1);

    themeButton.click();
    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("dark");
    expect(setPopupThemeMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the theme summary and toolbar state aligned across settings and worker rerenders", async () => {
    await importPopupMain();

    const openSettingsButton = document.querySelector<HTMLButtonElement>("[data-action='open-popup-settings']");

    if (!openSettingsButton) {
      throw new Error("Expected the popup settings button to be rendered.");
    }

    openSettingsButton.click();
    await flushMicrotasks();

    const firstThemeName = document.querySelector<HTMLElement>("[data-role='popup-theme-name']");

    if (!firstThemeName) {
      throw new Error("Expected the popup settings theme summary to be rendered.");
    }

    const initialThemeName = firstThemeName.textContent;
    getThemeButton().click();
    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(document.querySelector<HTMLElement>("[data-role='popup-theme-name']")?.textContent).not.toBe(initialThemeName);

    runtimeMessageListener?.({
      type: "WORKER_STATE_UPDATE",
      payload: makeState({ generatedAt: 2 })
    });
    await flushMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getThemeButton().dataset.popupThemeTarget).toBe("dark");
    expect(document.querySelector<HTMLElement>("[data-role='popup-theme-name']")?.textContent).not.toBe(initialThemeName);
  });
  it("clamps session meter width for invalid and out-of-range telemetry updates", async () => {
    sendMessageSafeMock.mockImplementation(async (command: { type: string }) => {
      if (command.type === "GET_STATE") {
        return {
          ok: true,
          data: makeState({
            sessions: [makeSession({ level: 1.4 })]
          })
        };
      }

      return {
        ok: true,
        data: null
      };
    });

    await importPopupMain();

    expect(getSessionMeterFill().style.width).toBe("100%");

    runtimeMessageListener?.({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 91,
        level: Number.NaN,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      }
    });
    await flushMicrotasks();

    expect(getSessionMeterFill().style.width).toBe("0%");

    runtimeMessageListener?.({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 91,
        level: -0.2,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      }
    });
    await flushMicrotasks();

    expect(getSessionMeterFill().style.width).toBe("0%");

    runtimeMessageListener?.({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 91,
        level: 0.02,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0.02
      }
    });
    await flushMicrotasks();

    expect(getSessionMeterFill().style.width).toBe("8%");
  });
});
