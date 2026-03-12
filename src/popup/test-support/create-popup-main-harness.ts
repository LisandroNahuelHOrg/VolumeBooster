import type { PopupTheme } from "../../shared/types";
import { flushPopupMainMicrotasks } from "./flush-popup-main-microtasks";
import { makePopupMainState } from "./make-popup-main-state";

export function createPopupMainHarness() {
  let persistedTheme: PopupTheme = "dark";
  let runtimeMessageListener: ((message: unknown) => void) | null = null;
  const captureExceptionSafeMock = vi.fn();
  const setPopupThemeMock = vi.fn(async (theme: PopupTheme) => {
    persistedTheme = theme;
    return theme;
  });
  const sendMessageSafeMock = vi.fn(async (command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return {
        ok: true,
        data: makePopupMainState()
      };
    }

    return {
      ok: true,
      data: null
    };
  });

  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';

  vi.doMock("../../shared/messages", () => ({
    message: (key: string) => ({ key }),
    sendMessageSafe: sendMessageSafeMock
  }));

  vi.doMock("../../shared/observability/sentry", () => ({
    initSentryForContext: vi.fn(),
    captureExceptionSafe: captureExceptionSafeMock
  }));

  vi.doMock("../../shared/storage", () => ({
    SettingsRepository: class {
      async getPopupTheme(): Promise<PopupTheme> {
        return persistedTheme;
      }

      async setPopupTheme(theme: PopupTheme): Promise<PopupTheme> {
        return (setPopupThemeMock as (popupTheme: PopupTheme) => Promise<PopupTheme>)(theme);
      }
    }
  }));

  vi.doMock("../../shared/ui-font-extension", () => ({
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

  return {
    captureExceptionSafeMock,
    sendMessageSafeMock,
    setPopupThemeMock,
    setPersistedTheme(nextTheme: PopupTheme) {
      persistedTheme = nextTheme;
    },
    getRuntimeMessageListener() {
      return runtimeMessageListener;
    },
    async importPopupMain(): Promise<void> {
      await import("../main");
      await flushPopupMainMicrotasks();
    }
  };
}
