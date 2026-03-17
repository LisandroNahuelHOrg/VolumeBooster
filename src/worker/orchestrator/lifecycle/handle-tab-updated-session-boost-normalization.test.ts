import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import { handleTabUpdated } from "./handle-tab-updated";
import { createTestRuntime } from "../internal/test-harness/create-test-runtime";

test("refreshes manual session metadata with the effective normalization bundle after tab updates", async () => {
  const harness = createTestRuntime();
  const advancedAudioSettings = applyQualityPreset("bass_boost", "clarity", "balanced", 111);

  vi.stubGlobal("chrome", {
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    },
    action: {
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeTextColor: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined)
    },
    tabs: {
      query: vi.fn().mockResolvedValue([])
    }
  } as unknown as typeof chrome);
  await harness.sessionBoostRepository.setState({
    globalDraftBundle: { gainPercent: 220, advancedAudioSettings },
    siteSessionBundles: {},
    promptDismissed: false
  });
  harness.runtime.manualSessions.set(7, {
    tabId: 7,
    title: "Example",
    url: "https://example.com/watch",
    domain: "example.com",
    gainPercent: 220,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0,
    warning: "none",
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0,
    normalizationInputLoudnessDb: null,
    normalizationAppliedGainDb: 0,
    normalizationOffsetScore: 0,
    normalizationAction: "holding",
    normalizationLoadPercent: 0,
    updatedAt: 1
  });

  await handleTabUpdated(
    harness.runtime,
    7,
    { url: "https://example.com/next" },
    {
      id: 7,
      title: "Example Next",
      url: "https://example.com/next"
    } as chrome.tabs.Tab
  );

  expect(harness.offscreenClient.updateMetadata).toHaveBeenCalledWith(
    expect.objectContaining({
      tabId: 7,
      advancedAudioSettings
    })
  );
  vi.unstubAllGlobals();
});
