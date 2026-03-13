// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainSession } from "./test-support/make-popup-main-session";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("retries SET_SESSION_BOOST_BUNDLE for gain drafts when the worker response comes back stale", async () => {
  const harness = createPopupMainHarness();
  const currentTab = {
    tabId: 91,
    title: "FocusStream",
    url: "https://example.com/watch",
    domain: "example.com",
    supported: true,
    preferredGainPercent: 100,
    hasStoredPreference: false,
    autoAttachState: "idle" as const
  };
  const baseSession = makePopupMainSession({
    tabId: 91,
    title: "FocusStream",
    url: "https://example.com/watch",
    domain: "example.com",
    gainPercent: 100
  });
  const idleState = makePopupMainState({
    currentTab,
    sessions: [baseSession]
  });
  const staleResponseState = makePopupMainState({
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: idleState.advancedAudioSettings },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false },
    currentTab,
    sessions: [{ ...baseSession, gainPercent: 100 }]
  });
  const convergedResponseState = makePopupMainState({
    boostSettingsBundle: { gainPercent: 250, advancedAudioSettings: idleState.advancedAudioSettings },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false },
    currentTab,
    sessions: [{ ...baseSession, gainPercent: 250 }]
  });
  let gainWriteCount = 0;

  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string; payload?: unknown }) => {
    if (command.type === "GET_STATE") {
      return { ok: true, data: idleState };
    }

    if (command.type === "SET_SESSION_BOOST_BUNDLE") {
      gainWriteCount += 1;
      return {
        ok: true,
        data: gainWriteCount === 1 ? staleResponseState : convergedResponseState
      };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();

  const slider = document.querySelector<HTMLInputElement>("[data-role='gain-slider']");
  if (!slider) {
    throw new Error("PopupGainSliderMissing");
  }

  slider.value = "250";
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));
  await flushPopupMainMicrotasks();

  const gainCalls = harness.sendMessageSafeMock.mock.calls.filter(
    ([command]) => command.type === "SET_SESSION_BOOST_BUNDLE"
  );
  expect(gainCalls).toEqual([
    [{
      type: "SET_SESSION_BOOST_BUNDLE",
      payload: {
        tabId: 91,
        bundle: {
          gainPercent: 250,
          advancedAudioSettings: idleState.advancedAudioSettings
        }
      }
    }],
    [{
      type: "SET_SESSION_BOOST_BUNDLE",
      payload: {
        tabId: 91,
        bundle: {
          gainPercent: 250,
          advancedAudioSettings: idleState.advancedAudioSettings
        }
      }
    }]
  ]);
  expect(document.querySelector<HTMLInputElement>("[data-role='gain-slider']")?.value).toBe("250");

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
