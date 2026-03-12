import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("throws localized errors when offscreen operations return failures", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    harness.sendMessage.mockResolvedValue({ ok: false, errorMessage: { key: "errorNoRunningSession" } });

    await expect(harness.client.setGain(1, 200)).rejects.toEqual({ key: "errorNoRunningSession" });
    await expect(
      harness.client.updateMetadata({ tabId: 1, title: "x", url: "https://x.com", domain: "x.com" })
    ).rejects.toEqual({ key: "errorNoRunningSession" });
    await expect(harness.client.stopSession(1)).rejects.toEqual({ key: "errorNoRunningSession" });
    await expect(harness.client.stopAll()).rejects.toEqual({ key: "errorNoRunningSession" });
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
