import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import { pauseAutoLaneForManual } from "./pause-auto-lane-for-manual";
import { createTestRuntime } from "../internal/test-harness/create-test-runtime";

test("suspends the auto lane with the effective session boost normalization settings", async () => {
  const harness = createTestRuntime();
  const advancedAudioSettings = applyQualityPreset("maximum_clarity", "balanced", "speech", 109);

  vi.stubGlobal("chrome", {
    tabs: {
      get: vi.fn().mockResolvedValue({
        id: 7,
        title: "Example",
        url: "https://example.com/watch"
      })
    }
  } as unknown as typeof chrome);
  await harness.sessionBoostRepository.setState({
    globalDraftBundle: { gainPercent: 210, advancedAudioSettings },
    siteSessionBundles: {},
    promptDismissed: false
  });
  harness.runtime.autoBoosterMode = "global";

  await pauseAutoLaneForManual(harness.runtime, 7);

  expect(harness.autoBoosterClient.configure).toHaveBeenCalledWith(
    7,
    expect.objectContaining({
      suspended: true,
      advancedAudioSettings
    })
  );
  vi.unstubAllGlobals();
});
