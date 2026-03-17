// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { popupRootClickContextRegistry } from "./popup-root-click-context-registry";

const mockedClickHandlers = vi.hoisted(() => ({
  applyPopupRender: vi.fn(),
  runPopupRootAction: vi.fn(),
  schedulePopupAdvancedSettingsCommit: vi.fn(),
  schedulePopupGainCommit: vi.fn(),
  startSessionBoostActionFeedback: vi.fn(),
  setPopupDraftAdvancedAudioSettings: vi.fn(),
  setPopupDraftGain: vi.fn(),
  stopPopupCapture: vi.fn()
}));

vi.mock("../runtime/apply-popup-render", () => ({ applyPopupRender: mockedClickHandlers.applyPopupRender }));
vi.mock("./run-popup-root-action", () => ({ runPopupRootAction: mockedClickHandlers.runPopupRootAction }));
vi.mock("../commits/schedule-popup-advanced-settings-commit", () => ({ schedulePopupAdvancedSettingsCommit: mockedClickHandlers.schedulePopupAdvancedSettingsCommit }));
vi.mock("../commits/schedule-popup-gain-commit", () => ({ schedulePopupGainCommit: mockedClickHandlers.schedulePopupGainCommit }));
vi.mock("../commits/set-popup-draft-advanced-audio-settings", () => ({ setPopupDraftAdvancedAudioSettings: mockedClickHandlers.setPopupDraftAdvancedAudioSettings }));
vi.mock("../commits/set-popup-draft-gain", () => ({ setPopupDraftGain: mockedClickHandlers.setPopupDraftGain }));
vi.mock("../commands/stop-popup-capture", () => ({ stopPopupCapture: mockedClickHandlers.stopPopupCapture }));
vi.mock("./start-session-boost-action-feedback", () => ({ startSessionBoostActionFeedback: mockedClickHandlers.startSessionBoostActionFeedback }));

import { dispatchRootClick } from "./dispatch-root-click";

test("routes click targets through the shared popup root click dispatcher", () => {
  vi.clearAllMocks();
  document.body.innerHTML = `
    <div id="popup-root">
      <button data-session-carousel-nav="next"></button>
      <button data-preset="175"></button>
      <button data-advanced-preset="maximum_clarity"></button>
      <button data-quality-protector="clarity"></button>
      <button data-stop-tab="91"></button>
      <button data-action="toggle-popup-theme"></button>
    </div>
  `;
  const rootElement = document.querySelector<HTMLDivElement>("#popup-root");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  state.currentState = makePopupMainState({
    advancedAudioSettings: applyQualityPreset("bass_boost")
  });
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const commandContext = { refs, state };
  const commitContext = { refs, state };

  popupRootClickContextRegistry.set(rootElement, { commandContext, commitContext });
  rootElement.addEventListener("click", dispatchRootClick);

  for (const selector of [
    "[data-session-carousel-nav]",
    "[data-preset]",
    "[data-advanced-preset]",
    "[data-quality-protector]",
    "[data-stop-tab]",
    "[data-action]"
  ]) {
    const target = document.querySelector(selector);

    if (!target) {
      throw new Error(`Missing test target for ${selector}`);
    }

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  expect(mockedClickHandlers.applyPopupRender).toHaveBeenCalledWith(refs, state);
  expect(mockedClickHandlers.setPopupDraftGain).toHaveBeenCalledWith(refs, state, 175, {
    animateVisuals: true
  });
  expect(mockedClickHandlers.setPopupDraftAdvancedAudioSettings).toHaveBeenNthCalledWith(
    2,
    refs,
    state,
    {
      ...state.currentState.advancedAudioSettings,
      qualityProtectorMode: "clarity"
    }
  );
  expect(mockedClickHandlers.schedulePopupGainCommit).toHaveBeenCalledWith(commitContext, true);
  expect(mockedClickHandlers.setPopupDraftAdvancedAudioSettings).toHaveBeenCalledTimes(2);
  expect(mockedClickHandlers.schedulePopupAdvancedSettingsCommit).toHaveBeenCalledTimes(2);
  expect(mockedClickHandlers.stopPopupCapture).toHaveBeenCalledWith(commandContext, 91);
  expect(mockedClickHandlers.runPopupRootAction).toHaveBeenCalledWith(
    "toggle-popup-theme",
    commandContext
  );
});

test("starts the session boost click feedback before routing the action", () => {
  vi.clearAllMocks();
  document.body.innerHTML = `
    <div id="popup-root">
      <section data-role="session-boost-bar">
        <button data-action="apply-session-boost-to-site"></button>
      </section>
    </div>
  `;
  const rootElement = document.querySelector<HTMLDivElement>("#popup-root");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  state.currentState = makePopupMainState();
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const commandContext = { refs, state };
  const commitContext = { refs, state };
  const target = document.querySelector<HTMLButtonElement>('[data-action="apply-session-boost-to-site"]');

  if (!target) {
    throw new Error("Missing session boost action button.");
  }

  popupRootClickContextRegistry.set(rootElement, { commandContext, commitContext });
  rootElement.addEventListener("click", dispatchRootClick);
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  expect(mockedClickHandlers.startSessionBoostActionFeedback).toHaveBeenCalledWith(
    commandContext,
    "apply-session-boost-to-site"
  );
  expect(mockedClickHandlers.runPopupRootAction).toHaveBeenCalledWith(
    "apply-session-boost-to-site",
    commandContext
  );
});
