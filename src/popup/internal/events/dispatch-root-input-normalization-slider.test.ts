// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { popupRootInputContextRegistry } from "./popup-root-input-context-registry";

const normalizationInputMocks = vi.hoisted(() => ({
  runPopupRootAction: vi.fn(),
  schedulePopupAdvancedSettingsCommit: vi.fn(),
  setPopupDraftAdvancedAudioSettings: vi.fn()
}));

vi.mock("./run-popup-root-action", () => ({ runPopupRootAction: normalizationInputMocks.runPopupRootAction }));
vi.mock("../commits/schedule-popup-advanced-settings-commit", () => ({
  schedulePopupAdvancedSettingsCommit: normalizationInputMocks.schedulePopupAdvancedSettingsCommit
}));
vi.mock("../commits/set-popup-draft-advanced-audio-settings", () => ({
  setPopupDraftAdvancedAudioSettings: normalizationInputMocks.setPopupDraftAdvancedAudioSettings
}));

import { dispatchRootInput } from "./dispatch-root-input";

test("keeps the visible preset state while dragging the normalization target slider", () => {
  document.body.innerHTML =
    '<div id="popup-root"><input data-role="normalization-slider" type="range" value="112" /></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#popup-root");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  state.currentState = makePopupMainState({
    advancedAudioSettings: applyQualityPreset("bass_boost", "clarity", "balanced", 106)
  });
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const context = { commandContext: { refs, state }, commitContext: { refs, state } };
  const target = document.querySelector<HTMLInputElement>("[data-role='normalization-slider']");

  if (!target) {
    throw new Error("Missing normalization slider.");
  }

  popupRootInputContextRegistry.set(rootElement, context);
  rootElement.addEventListener("input", dispatchRootInput);
  target.dispatchEvent(new Event("input", { bubbles: true }));

  expect(normalizationInputMocks.setPopupDraftAdvancedAudioSettings).toHaveBeenCalledWith(
    refs,
    state,
    {
      ...state.currentState.advancedAudioSettings,
      volumeNormalizationTargetPercent: 112
    }
  );
  expect(normalizationInputMocks.schedulePopupAdvancedSettingsCommit).toHaveBeenCalledWith(
    context.commitContext,
    false
  );
  expect(normalizationInputMocks.runPopupRootAction).not.toHaveBeenCalled();
});
