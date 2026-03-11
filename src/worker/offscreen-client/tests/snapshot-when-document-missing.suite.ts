import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("returns an empty snapshot when the offscreen document is absent", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValueOnce([]);
    await expect(harness.client.getSnapshot()).resolves.toEqual([]);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
