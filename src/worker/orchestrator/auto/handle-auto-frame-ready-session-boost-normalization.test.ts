import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import { handleAutoFrameReady } from "./handle-auto-frame-ready";
import { createTestRuntime } from "../internal/test-harness/create-test-runtime";

test("keeps session boost normalization settings when a new auto frame becomes ready", async () => {
  const harness = createTestRuntime();
  const advancedAudioSettings = applyQualityPreset("bass_boost", "clarity", "aggressive", 112);

  await harness.sessionBoostRepository.setState({
    globalDraftBundle: { gainPercent: 230, advancedAudioSettings },
    siteSessionBundles: {},
    promptDismissed: false
  });
  harness.runtime.autoBoosterMode = "global";

  await handleAutoFrameReady(
    harness.runtime,
    {
      tabId: 7,
      title: "Example",
      url: "https://example.com/watch",
      domain: "example.com",
      favIconUrl: "https://example.com/icon.ico"
    },
    {
      tab: { id: 7 },
      url: "https://example.com/watch"
    } as chrome.runtime.MessageSender
  );

  expect(harness.autoBoosterClient.configure).toHaveBeenCalledWith(
    7,
    expect.objectContaining({
      advancedAudioSettings
    }),
    expect.objectContaining({
      frameId: 0
    })
  );
  vi.unstubAllGlobals();
});
