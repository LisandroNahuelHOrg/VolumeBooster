// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { popupRootClickContextRegistry } from "./popup-root-click-context-registry";

const clickPremiumMocks = vi.hoisted(() => ({
  runPopupRootAction: vi.fn(),
  schedulePopupAdvancedSettingsCommit: vi.fn(),
  setPopupDraftAdvancedAudioSettings: vi.fn()
}));

vi.mock("./run-popup-root-action", () => ({ runPopupRootAction: clickPremiumMocks.runPopupRootAction }));
vi.mock("../commits/schedule-popup-advanced-settings-commit", () => ({
  schedulePopupAdvancedSettingsCommit: clickPremiumMocks.schedulePopupAdvancedSettingsCommit
}));
vi.mock("../commits/set-popup-draft-advanced-audio-settings", () => ({
  setPopupDraftAdvancedAudioSettings: clickPremiumMocks.setPopupDraftAdvancedAudioSettings
}));

import { dispatchRootClick } from "./dispatch-root-click";

test("routes premium-only click controls to the premium view when entitlement is inactive", () => {
  document.body.innerHTML = '<div id="popup-root"><button data-advanced-preset="maximum_clarity"></button></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#popup-root");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  state.currentState = makePopupMainState({
    premiumEntitlement: {
      status: "inactive",
      source: "free",
      storedLicenseStatus: "none",
      plan: "free",
      isPremiumUnlocked: false,
      email: null,
      hasStoredLicense: false,
      seatIndex: null,
      trialStartedAt: "2026-01-01T00:00:00.000Z",
      trialEndsAt: "2026-01-31T00:00:00.000Z",
      trialDaysRemaining: 0
    }
  });
  const refs = { document, rootElement, settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() }, window };
  const context = { commandContext: { refs, state }, commitContext: { refs, state } };
  const target = document.querySelector<HTMLButtonElement>("[data-advanced-preset]");

  if (!target) {
    throw new Error("Missing premium preset button.");
  }

  popupRootClickContextRegistry.set(rootElement, context);
  rootElement.addEventListener("click", dispatchRootClick);
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  expect(clickPremiumMocks.runPopupRootAction).toHaveBeenCalledWith("open-popup-premium", context.commandContext);
  expect(clickPremiumMocks.schedulePopupAdvancedSettingsCommit).not.toHaveBeenCalled();
  expect(clickPremiumMocks.setPopupDraftAdvancedAudioSettings).not.toHaveBeenCalled();
});
