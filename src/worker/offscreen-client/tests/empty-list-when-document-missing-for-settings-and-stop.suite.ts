import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("returns an empty list when no document exists for advanced settings or stop operations", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValue([]);

    await expect(harness.client.setAdvancedAudioSettings({} as never)).resolves.toEqual([]);
    await expect(harness.client.stopSession(1)).resolves.toEqual([]);
    await expect(harness.client.stopAll()).resolves.toEqual([]);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
