// @vitest-environment happy-dom

import { applyQualityPreset, DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainSession } from "./test-support/make-popup-main-session";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("retries SET_SESSION_BOOST_BUNDLE for advanced-setting drafts when the worker response comes back stale", async () => {
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
  const targetSettings = applyQualityPreset("bass_boost", DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityProtectorMode);
  const idleState = makePopupMainState({
    currentTab,
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });
  const staleResponseState = makePopupMainState({
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS } },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false },
    currentTab,
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });
  const convergedResponseState = makePopupMainState({
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: { ...targetSettings } },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false },
    currentTab,
    advancedAudioSettings: { ...targetSettings },
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });
  let advancedWriteCount = 0;

  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string; payload?: unknown }) => {
    if (command.type === "GET_STATE") {
      return { ok: true, data: idleState };
    }

    if (command.type === "SET_SESSION_BOOST_BUNDLE") {
      advancedWriteCount += 1;
      return {
        ok: true,
        data: advancedWriteCount === 1 ? staleResponseState : convergedResponseState
      };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();

  document
    .querySelector<HTMLButtonElement>("[data-advanced-preset='bass_boost']")
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushPopupMainMicrotasks();

  const advancedCalls = harness.sendMessageSafeMock.mock.calls.filter(
    ([command]) => command.type === "SET_SESSION_BOOST_BUNDLE"
  );
  expect(advancedCalls).toHaveLength(2);
  expect(advancedCalls[0]?.[0]).toEqual({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: {
      tabId: 91,
      bundle: {
        gainPercent: 100,
        advancedAudioSettings: targetSettings
      }
    }
  });
  expect(advancedCalls[1]?.[0]).toEqual({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: {
      tabId: 91,
      bundle: {
        gainPercent: 100,
        advancedAudioSettings: targetSettings
      }
    }
  });
  expect(document.querySelector<HTMLElement>("[data-role='advanced-preset-value']")?.textContent?.trim()).not.toBe(
    ""
  );

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
