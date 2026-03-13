// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { loadLocaleCatalog } from "../../../shared/runtime-i18n";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { applyPopupRender } from "./apply-popup-render";
import { applyPopupWorkerState } from "./apply-popup-worker-state";
import { createPopupRuntimeState } from "./create-popup-runtime-state";

test("realigns the local gain draft after a successful reset-site worker response and then hides the prompt", async () => {
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
  const currentTab = {
    tabId: 7,
    title: "Video",
    url: "https://video.example",
    domain: "video.example",
    supported: true,
    preferredGainPercent: 100,
    hasStoredPreference: false,
    autoAttachState: "attached" as const
  };
  const state = createPopupRuntimeState();

  state.currentCatalog = catalog;
  state.initialStateStatus = "ready";
  state.currentState = makePopupMainState({
    currentTab,
    boostSettingsBundle: {
      gainPercent: 100,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false }
  });
  state.draftGainPercent = 175;
  applyPopupRender(refs, state);
  const sessionBoostBar = document.querySelector<HTMLElement>('[data-role="session-boost-bar"]');

  if (!sessionBoostBar) {
    throw new Error("Missing session boost bar.");
  }

  animationFrames.get(state.popupDomRuntime.sessionBoostBarRevealFrame ?? -1)?.(0);
  state.sessionBoostAcknowledgedAction = "reset-session-boost-on-site";
  applyPopupRender(refs, state);
  await applyPopupWorkerState(
    refs,
    state,
    makePopupMainState({
      currentTab,
      boostSettingsBundle: {
        gainPercent: 100,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      sessionBoostPromptState: { hasUnsavedChanges: false, dismissed: false }
    })
  );
  const resolvedSessionBoostBar = document.querySelector<HTMLElement>('[data-role="session-boost-bar"]');

  if (!resolvedSessionBoostBar) {
    throw new Error("Missing session boost bar after reset-site worker response.");
  }

  expect(state.draftGainPercent).toBe(100);
  expect(resolvedSessionBoostBar.classList.contains("is-visible")).toBe(true);
  expect(
    resolvedSessionBoostBar
      .querySelector<HTMLElement>('[data-action="reset-session-boost-on-site"]')
      ?.classList.contains("is-acknowledged")
  ).toBe(true);

  state.sessionBoostAcknowledgedAction = null;
  applyPopupRender(refs, state);
  const hiddenSessionBoostBar = document.querySelector<HTMLElement>('[data-role="session-boost-bar"]');

  if (!hiddenSessionBoostBar) {
    throw new Error("Missing session boost bar after acknowledgment cleanup.");
  }

  expect(hiddenSessionBoostBar.classList.contains("is-visible")).toBe(false);
  expect(hiddenSessionBoostBar.getAttribute("aria-hidden")).toBe("true");

  vi.unstubAllGlobals();
});
