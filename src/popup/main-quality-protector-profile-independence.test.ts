// @vitest-environment happy-dom

import { applyQualityPreset } from "../shared/audio-settings";
import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainSession } from "./test-support/make-popup-main-session";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("keeps the selected sound profile when the quality protector mode changes", async () => {
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
  const initialSettings = applyQualityPreset("bass_boost");
  const targetSettings = {
    ...initialSettings,
    qualityProtectorMode: "clarity" as const
  };
  const idleState = makePopupMainState({
    currentTab,
    advancedAudioSettings: initialSettings,
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: initialSettings },
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });
  const convergedResponseState = makePopupMainState({
    currentTab,
    advancedAudioSettings: targetSettings,
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: targetSettings },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false },
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });

  harness.sendMessageSafeMock
    .mockResolvedValueOnce({ ok: true, data: idleState })
    .mockResolvedValueOnce({ ok: true, data: convergedResponseState });

  await harness.importPopupMain();

  document
    .querySelector<HTMLButtonElement>("[data-quality-protector='clarity']")
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushPopupMainMicrotasks();

  const advancedCall = harness.sendMessageSafeMock.mock.calls.find(
    ([command]) => command.type === "SET_SESSION_BOOST_BUNDLE"
  )?.[0];

  expect(advancedCall).toEqual({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: {
      tabId: 91,
      bundle: {
        gainPercent: 100,
        advancedAudioSettings: targetSettings
      }
    }
  });
  expect(document.querySelector<HTMLElement>("[data-role='advanced-preset-value']")?.textContent?.trim()).toBe(
    "Bass Boost"
  );
  expect(
    document.querySelector<HTMLElement>("[data-role='advanced-custom-badge']")?.classList.contains("is-active")
  ).toBe(false);

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
