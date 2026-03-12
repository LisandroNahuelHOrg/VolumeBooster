import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("returns snapshot sessions only when the response is successful", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    harness.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { sessions: [{ tabId: 1 }] } })
      .mockResolvedValueOnce({ ok: false });

    await expect(harness.client.getSnapshot()).resolves.toEqual([{ tabId: 1 }]);
    await expect(harness.client.getSnapshot()).resolves.toEqual([]);

    expect(harness.sendMessage).toHaveBeenNthCalledWith(1, { type: "OFFSCREEN_GET_SNAPSHOT" });
    expect(harness.sendMessage).toHaveBeenNthCalledWith(2, { type: "OFFSCREEN_GET_SNAPSHOT" });
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
