import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";
import { offscreenSessions, updateMetadataPayload } from "./test-payloads.suite";

it("returns session lists for successful metadata and stop operations", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    harness.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { sessions: offscreenSessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions: offscreenSessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions: offscreenSessions } });

    await expect(harness.client.updateMetadata(updateMetadataPayload)).resolves.toEqual(offscreenSessions);
    await expect(harness.client.stopSession(7)).resolves.toEqual(offscreenSessions);
    await expect(harness.client.stopAll()).resolves.toEqual(offscreenSessions);

    expect(harness.sendMessage).toHaveBeenNthCalledWith(1, {
      type: "OFFSCREEN_UPDATE_METADATA",
      payload: updateMetadataPayload
    });
    expect(harness.sendMessage).toHaveBeenNthCalledWith(2, {
      type: "OFFSCREEN_STOP_SESSION",
      payload: { tabId: 7 }
    });
    expect(harness.sendMessage).toHaveBeenNthCalledWith(3, { type: "OFFSCREEN_STOP_ALL" });
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
