// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { popupRootChangeContextRegistry } from "./popup-root-change-context-registry";

const normalizationChangeMocks = vi.hoisted(() => ({
  flushPopupAdvancedSettingsCommit: vi.fn()
}));

vi.mock("../commits/flush-popup-advanced-settings-commit", () => ({
  flushPopupAdvancedSettingsCommit: normalizationChangeMocks.flushPopupAdvancedSettingsCommit
}));

import { dispatchRootChange } from "./dispatch-root-change";

test("flushes normalization slider changes immediately and clears the adjusting flag", () => {
  document.body.innerHTML =
    '<div id="popup-root"><input data-role="normalization-slider" type="range" value="112" /></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#popup-root");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  state.isAdjustingAdvancedSettings = true;
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const commitContext = { refs, state };
  const target = document.querySelector<HTMLInputElement>("[data-role='normalization-slider']");

  if (!target) {
    throw new Error("Missing normalization slider.");
  }

  popupRootChangeContextRegistry.set(rootElement, { commitContext });
  rootElement.addEventListener("change", dispatchRootChange);
  target.dispatchEvent(new Event("change", { bubbles: true }));

  expect(state.isAdjustingAdvancedSettings).toBe(false);
  expect(normalizationChangeMocks.flushPopupAdvancedSettingsCommit).toHaveBeenCalledWith(
    commitContext
  );
});
