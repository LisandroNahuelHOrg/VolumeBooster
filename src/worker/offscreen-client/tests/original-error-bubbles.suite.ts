import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("throws the original error when delivery fails for a reason other than a missing receiver", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    harness.sendMessage.mockRejectedValue(new Error("boom"));

    await expect(harness.client.getSnapshot()).rejects.toThrow("boom");
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
