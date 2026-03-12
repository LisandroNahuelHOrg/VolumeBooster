// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("hides the session boost prompt after reset-on-site completes its sync then clears the worker draft", async () => {
  const harness = createPopupMainHarness();
  const currentTab = {
    tabId: 91,
    title: "FocusStream",
    url: "https://example.com/watch",
    domain: "example.com",
    supported: true,
    preferredGainPercent: 100,
    hasStoredPreference: true,
    autoAttachState: "idle" as const
  };
  const baseState = makePopupMainState({
    currentTab,
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: makePopupMainState().advancedAudioSettings }
  });
  const stagedState = makePopupMainState({
    currentTab,
    boostSettingsBundle: { gainPercent: 175, advancedAudioSettings: baseState.advancedAudioSettings },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false }
  });
  const resolvedState = makePopupMainState({
    currentTab: { ...currentTab, hasStoredPreference: false },
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: baseState.advancedAudioSettings },
    sessionBoostPromptState: { hasUnsavedChanges: false, dismissed: false }
  });

  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string; payload?: unknown }) => {
    if (command.type === "GET_STATE") {
      return { ok: true, data: baseState };
    }

    if (command.type === "SET_SESSION_BOOST_BUNDLE") {
      return { ok: true, data: stagedState };
    }

    if (command.type === "RESET_SESSION_BOOST_ON_SITE") {
      return { ok: true, data: resolvedState };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();

  const slider = document.querySelector<HTMLInputElement>("[data-role='gain-slider']");
  if (!slider) {
    throw new Error("PopupGainSliderMissing");
  }

  slider.value = "175";
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));
  await flushPopupMainMicrotasks();

  const resetButton = document.querySelector<HTMLButtonElement>('[data-action="reset-session-boost-on-site"]');
  if (!resetButton) {
    throw new Error("ResetSiteButtonMissing");
  }

  resetButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushPopupMainMicrotasks();

  const sessionBoostBar = document.querySelector<HTMLElement>('[data-role="session-boost-bar"]');
  if (!sessionBoostBar) {
    throw new Error("SessionBoostBarMissing");
  }

  expect(sessionBoostBar.classList.contains("is-visible")).toBe(true);
  expect(resetButton.classList.contains("is-acknowledged")).toBe(true);
  expect(
    harness.sendMessageSafeMock.mock.calls
      .map(([command]) => command.type)
      .filter((type) => type !== "GET_STATE")
  ).toEqual(["SET_SESSION_BOOST_BUNDLE", "RESET_SESSION_BOOST_ON_SITE"]);

  vi.advanceTimersByTime(200);
  await flushPopupMainMicrotasks();

  expect(document.querySelector<HTMLElement>('[data-role="session-boost-bar"]')?.classList.contains("is-visible")).toBe(
    false
  );
  expect(document.querySelector<HTMLElement>('[data-role="session-boost-bar"]')?.getAttribute("aria-hidden")).toBe("true");
  expect(document.querySelector<HTMLInputElement>("[data-role='gain-slider']")?.value).toBe("100");

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
