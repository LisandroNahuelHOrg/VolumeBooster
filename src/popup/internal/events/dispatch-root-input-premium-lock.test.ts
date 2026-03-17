// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { popupRootInputContextRegistry } from "./popup-root-input-context-registry";

const inputPremiumMocks = vi.hoisted(() => ({
  runPopupRootAction: vi.fn(),
  schedulePopupAdvancedSettingsCommit: vi.fn(),
  updatePopupDraftAdvancedSetting: vi.fn()
}));

vi.mock("./run-popup-root-action", () => ({ runPopupRootAction: inputPremiumMocks.runPopupRootAction }));
vi.mock("../commits/schedule-popup-advanced-settings-commit", () => ({
  schedulePopupAdvancedSettingsCommit: inputPremiumMocks.schedulePopupAdvancedSettingsCommit
}));
vi.mock("../commits/update-popup-draft-advanced-setting", () => ({
  updatePopupDraftAdvancedSetting: inputPremiumMocks.updatePopupDraftAdvancedSetting
}));

import { dispatchRootInput } from "./dispatch-root-input";

test("routes premium-only sliders to the premium view when entitlement is inactive", () => {
  document.body.innerHTML = '<div id="popup-root"><input data-role="advanced-slider" data-advanced-key="ceilingDb" type="range" value="-0.8" /></div>';
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
  const target = document.querySelector<HTMLInputElement>("[data-role='advanced-slider']");

  if (!target) {
    throw new Error("Missing advanced slider.");
  }

  popupRootInputContextRegistry.set(rootElement, context);
  rootElement.addEventListener("input", dispatchRootInput);
  target.dispatchEvent(new Event("input", { bubbles: true }));

  expect(inputPremiumMocks.runPopupRootAction).toHaveBeenCalledWith("open-popup-premium", context.commandContext);
  expect(inputPremiumMocks.schedulePopupAdvancedSettingsCommit).not.toHaveBeenCalled();
  expect(inputPremiumMocks.updatePopupDraftAdvancedSetting).not.toHaveBeenCalled();
});
