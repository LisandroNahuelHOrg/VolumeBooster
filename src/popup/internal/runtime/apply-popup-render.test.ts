// @vitest-environment happy-dom
import { expect, test, vi } from "vitest";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { loadLocaleCatalog, t, translate } from "../../../shared/runtime-i18n";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { applyPopupRender } from "./apply-popup-render";
import { createPopupRuntimeState } from "./create-popup-runtime-state";
test("renders loading, error, and ready shells from the explicit initial state status", async () => {
  document.body.innerHTML = '<div id="app"></div>';
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
  const rootElement = document.querySelector<HTMLDivElement>("#app");
  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const catalog = await loadLocaleCatalog("en");
  const state = createPopupRuntimeState();
  state.currentCatalog = catalog;
  state.initialStateStatus = "pending";
  applyPopupRender(refs, state);
  expect(document.querySelector(".hero__subtitle")?.textContent?.trim()).toBe(t("loadingLabel"));
  expect(document.querySelector(".chip")).toBeNull();

  state.initialStateStatus = "failed";
  state.transientError = { key: "errorGetState" };
  applyPopupRender(refs, state);
  expect(document.querySelector(".chip")?.textContent?.trim()).toBe(translate(catalog, "errorPrefix"));
  expect(document.querySelector(".hero__subtitle")?.textContent?.trim()).toBe(t("errorGetState"));

  state.initialStateStatus = "ready";
  state.currentState = makePopupMainState();
  applyPopupRender(refs, state);
  expect(document.querySelector("[data-popup-toolbar]")).not.toBeNull();

  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("animates the session boost bar in and out without replacing its DOM node", async () => {
  document.body.innerHTML = '<div id="app"></div>';
  let nextFrameId = 0;
  const animationFrames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", ((callback: FrameRequestCallback) => {
    nextFrameId += 1;
    animationFrames.set(nextFrameId, callback);
    return nextFrameId;
  }) as typeof requestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", vi.fn((frameId: number) => {
    animationFrames.delete(frameId);
  }));
  Element.prototype.animate = vi.fn(() => ({
    cancel: vi.fn(),
    finished: Promise.resolve(),
    pause: vi.fn(),
    play: vi.fn()
  })) as unknown as typeof Element.prototype.animate;
  const rootElement = document.querySelector<HTMLDivElement>("#app");
  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const catalog = await loadLocaleCatalog("en");
  const state = createPopupRuntimeState();
  state.currentCatalog = catalog;
  state.initialStateStatus = "ready";
  state.currentState = makePopupMainState({
    currentTab: {
      tabId: 7,
      title: "Video",
      url: "https://video.example",
      domain: "video.example",
      supported: true,
      preferredGainPercent: 100,
      hasStoredPreference: false,
      autoAttachState: "attached"
    },
    boostSettingsBundle: {
      gainPercent: 100,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    }
  });

  applyPopupRender(refs, state);
  const sessionBoostBar = document.querySelector<HTMLElement>('[data-role="session-boost-bar"]');
  expect(sessionBoostBar).not.toBeNull();
  expect(sessionBoostBar?.classList.contains("is-visible")).toBe(false);
  expect(sessionBoostBar?.getAttribute("aria-hidden")).toBe("true");
  expect(sessionBoostBar?.hasAttribute("inert")).toBe(true);

  state.draftGainPercent = 175;
  applyPopupRender(refs, state);
  const firstRevealFrame = state.popupDomRuntime.sessionBoostBarRevealFrame;
  expect(document.querySelector('[data-role="session-boost-bar"]')).toBe(sessionBoostBar);
  expect(sessionBoostBar?.classList.contains("is-visible")).toBe(false);
  expect(firstRevealFrame).not.toBeNull();
  expect(animationFrames.has(firstRevealFrame ?? -1)).toBe(true);

  state.draftGainPercent = 100;
  applyPopupRender(refs, state);
  expect(document.querySelector('[data-role="session-boost-bar"]')).toBe(sessionBoostBar);
  expect(sessionBoostBar?.classList.contains("is-visible")).toBe(false);
  expect(sessionBoostBar?.getAttribute("aria-hidden")).toBe("true");
  expect(sessionBoostBar?.hasAttribute("inert")).toBe(true);
  expect(state.popupDomRuntime.sessionBoostBarRevealFrame).toBeNull();
  expect(animationFrames.has(firstRevealFrame ?? -1)).toBe(false);

  state.draftGainPercent = 175;
  applyPopupRender(refs, state);
  const secondRevealFrame = state.popupDomRuntime.sessionBoostBarRevealFrame;
  expect(secondRevealFrame).not.toBeNull();
  animationFrames.get(secondRevealFrame ?? -1)?.(0);
  expect(sessionBoostBar?.classList.contains("is-visible")).toBe(true);
  expect(sessionBoostBar?.getAttribute("aria-hidden")).toBe("false");
  expect(sessionBoostBar?.hasAttribute("inert")).toBe(false);

  state.draftGainPercent = 100;
  applyPopupRender(refs, state);
  expect(document.querySelector('[data-role="session-boost-bar"]')).toBe(sessionBoostBar);
  expect(sessionBoostBar?.classList.contains("is-visible")).toBe(false);
  expect(sessionBoostBar?.getAttribute("aria-hidden")).toBe("true");
  expect(sessionBoostBar?.hasAttribute("inert")).toBe(true);

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
