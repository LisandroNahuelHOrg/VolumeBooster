// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { loadLocaleCatalog } from "../../../shared/runtime-i18n";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { applyPopupRender } from "./apply-popup-render";
import { createPopupRuntimeState } from "./create-popup-runtime-state";

test("keeps the session boost bar visible long enough to show the acknowledged button glow", async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const animationFrames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", ((callback: FrameRequestCallback) => {
    const frameId = animationFrames.size + 1;
    animationFrames.set(frameId, callback);
    return frameId;
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
  state.draftGainPercent = 175;

  applyPopupRender(refs, state);
  const sessionBoostBar = document.querySelector<HTMLElement>('[data-role="session-boost-bar"]');

  if (!sessionBoostBar) {
    throw new Error("Missing session boost bar.");
  }

  animationFrames.get(state.popupDomRuntime.sessionBoostBarRevealFrame ?? -1)?.(0);
  expect(sessionBoostBar.classList.contains("is-visible")).toBe(true);

  state.draftGainPercent = 100;
  state.sessionBoostAcknowledgedAction = "apply-session-boost-to-site";
  applyPopupRender(refs, state);
  expect(sessionBoostBar.classList.contains("is-visible")).toBe(true);
  expect(sessionBoostBar.getAttribute("aria-hidden")).toBe("false");
  expect(sessionBoostBar.getAttribute("data-feedback-locked")).toBe("true");
  expect(sessionBoostBar.hasAttribute("inert")).toBe(true);
  expect(
    sessionBoostBar
      .querySelector<HTMLElement>('[data-action="apply-session-boost-to-site"]')
      ?.classList.contains("is-acknowledged")
  ).toBe(true);
  expect(
    sessionBoostBar
      .querySelector<HTMLElement>('[data-action="reset-session-boost-on-site"]')
      ?.classList.contains("is-acknowledged")
  ).toBe(false);

  state.sessionBoostAcknowledgedAction = null;
  applyPopupRender(refs, state);
  expect(sessionBoostBar.classList.contains("is-visible")).toBe(false);
  expect(sessionBoostBar.getAttribute("aria-hidden")).toBe("true");
  expect(sessionBoostBar.getAttribute("data-feedback-locked")).toBe("false");
  expect(sessionBoostBar.hasAttribute("inert")).toBe(true);

  vi.unstubAllGlobals();
});
