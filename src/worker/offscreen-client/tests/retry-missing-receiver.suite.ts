import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("retries the message after recreating the offscreen receiver", async () => {
  const harness = createOffscreenClientTestHarness();
  const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

  try {
    harness.getContexts
      .mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    harness.sendMessage
      .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
      .mockResolvedValueOnce({ ok: true, data: { sessions: [{ tabId: 1 }] } });

    await expect(harness.client.getSnapshot()).resolves.toEqual([{ tabId: 1 }]);
    expect(harness.createDocument).toHaveBeenCalledTimes(1);
    expect(harness.sendMessage).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
