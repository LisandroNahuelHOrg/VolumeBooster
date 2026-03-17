// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { popupRootClickContextRegistry } from "./popup-root-click-context-registry";

const normalizationClickMocks = vi.hoisted(() => ({
  runPopupRootAction: vi.fn(),
  schedulePopupAdvancedSettingsCommit: vi.fn(),
  setPopupDraftAdvancedAudioSettings: vi.fn()
}));

vi.mock("./run-popup-root-action", () => ({ runPopupRootAction: normalizationClickMocks.runPopupRootAction }));
vi.mock("../commits/schedule-popup-advanced-settings-commit", () => ({
  schedulePopupAdvancedSettingsCommit: normalizationClickMocks.schedulePopupAdvancedSettingsCommit
}));
vi.mock("../commits/set-popup-draft-advanced-audio-settings", () => ({
  setPopupDraftAdvancedAudioSettings: normalizationClickMocks.setPopupDraftAdvancedAudioSettings
}));

import { dispatchRootClick } from "./dispatch-root-click";

test("keeps the visible sound profile state when a normalization mode button is clicked", () => {
  document.body.innerHTML =
    '<div id="popup-root"><button data-volume-normalization="aggressive"></button></div>';
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
  const target = document.querySelector<HTMLButtonElement>("[data-volume-normalization]");

  if (!target) {
    throw new Error("Missing normalization mode button.");
  }

  popupRootClickContextRegistry.set(rootElement, context);
  rootElement.addEventListener("click", dispatchRootClick);
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  expect(normalizationClickMocks.setPopupDraftAdvancedAudioSettings).toHaveBeenCalledWith(
    refs,
    state,
    {
      ...state.currentState.advancedAudioSettings,
      volumeNormalizationMode: "aggressive"
    }
  );
  expect(normalizationClickMocks.schedulePopupAdvancedSettingsCommit).toHaveBeenCalledWith(
    context.commitContext,
    true
  );
  expect(normalizationClickMocks.runPopupRootAction).not.toHaveBeenCalled();
});
