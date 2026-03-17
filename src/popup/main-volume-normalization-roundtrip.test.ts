// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../shared/audio-settings";
import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainSession } from "./test-support/make-popup-main-session";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("round-trips premium normalization mode and target changes without promoting the sound profile", async () => {
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
  const initialSettings = applyQualityPreset("bass_boost", "clarity", "balanced", 100);
  const modeSettings = { ...initialSettings, volumeNormalizationMode: "aggressive" as const };
  const targetSettings = { ...modeSettings, volumeNormalizationTargetPercent: 112 };
  const idleState = makePopupMainState({
    currentTab,
    advancedAudioSettings: initialSettings,
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: initialSettings },
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });
  const modeResponseState = makePopupMainState({
    currentTab,
    advancedAudioSettings: modeSettings,
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: modeSettings },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false },
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });
  const targetResponseState = makePopupMainState({
    currentTab,
    advancedAudioSettings: targetSettings,
    boostSettingsBundle: { gainPercent: 100, advancedAudioSettings: targetSettings },
    sessionBoostPromptState: { hasUnsavedChanges: true, dismissed: false },
    sessions: [makePopupMainSession({ tabId: 91, gainPercent: 100 })]
  });

  harness.sendMessageSafeMock
    .mockResolvedValueOnce({ ok: true, data: idleState })
    .mockResolvedValueOnce({ ok: true, data: modeResponseState })
    .mockResolvedValueOnce({ ok: true, data: targetResponseState });

  await harness.importPopupMain();

  document
    .querySelector<HTMLButtonElement>("[data-volume-normalization='aggressive']")
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushPopupMainMicrotasks();

  const slider = document.querySelector<HTMLInputElement>("[data-role='normalization-slider']");

  if (!slider) {
    throw new Error("Missing normalization slider.");
  }

  slider.value = "112";
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));
  await flushPopupMainMicrotasks();

  const advancedCalls = harness.sendMessageSafeMock.mock.calls.filter(
    ([command]) => command.type === "SET_SESSION_BOOST_BUNDLE"
  );

  expect(advancedCalls).toHaveLength(2);
  expect(advancedCalls[0]?.[0]).toEqual({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: { tabId: 91, bundle: { gainPercent: 100, advancedAudioSettings: modeSettings } }
  });
  expect(advancedCalls[1]?.[0]).toEqual({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: { tabId: 91, bundle: { gainPercent: 100, advancedAudioSettings: targetSettings } }
  });
  expect(document.querySelector<HTMLElement>("[data-role='advanced-preset-value']")?.textContent?.trim()).toBe(
    "Bass Boost"
  );
  expect(
    document.querySelector<HTMLElement>("[data-role='advanced-custom-badge']")?.classList.contains("is-active")
  ).toBe(false);
  expect(
    document.querySelector<HTMLElement>("[data-role='volume-normalization-mode-value']")?.textContent?.trim()
  ).toBe("Aggressive");
  expect(document.querySelector<HTMLElement>("[data-role='normalization-target-value']")?.textContent?.trim()).toBe(
    "112%"
  );

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
