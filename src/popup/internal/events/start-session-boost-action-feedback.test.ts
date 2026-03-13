// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";

const mockedSync = vi.hoisted(() => ({
  syncPopupCurrentViewModel: vi.fn()
}));

vi.mock("../runtime/sync-popup-current-view-model", () => ({
  syncPopupCurrentViewModel: mockedSync.syncPopupCurrentViewModel
}));

import { startSessionBoostActionFeedback } from "./start-session-boost-action-feedback";

test("captures the clicked action, syncs immediately, and clears it after the feedback window", () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#app");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const context = { refs, state };

  startSessionBoostActionFeedback(context, "apply-session-boost-to-site");
  expect(state.sessionBoostAcknowledgedAction).toBe("apply-session-boost-to-site");
  expect(state.popupDomRuntime.sessionBoostAcknowledgeTimer).not.toBeNull();
  expect(mockedSync.syncPopupCurrentViewModel).toHaveBeenCalledWith(refs, state);

  vi.advanceTimersByTime(200);
  expect(state.sessionBoostAcknowledgedAction).toBeNull();
  expect(state.popupDomRuntime.sessionBoostAcknowledgeTimer).toBeNull();
  expect(mockedSync.syncPopupCurrentViewModel).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
