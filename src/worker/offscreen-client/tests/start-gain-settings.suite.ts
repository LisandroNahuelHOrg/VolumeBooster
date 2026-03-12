import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";
import { offscreenSessions, startSessionPayload } from "./test-payloads.suite";

it("starts sessions and updates settings through the offscreen document", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    harness.sendMessage
      .mockResolvedValueOnce({ ok: true, data: { sessions: offscreenSessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions: offscreenSessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions: offscreenSessions } });

    await expect(harness.client.startSession(startSessionPayload)).resolves.toEqual(offscreenSessions);
    await expect(harness.client.setGain(7, 260)).resolves.toEqual(offscreenSessions);

    harness.getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await expect(harness.client.setAdvancedAudioSettings({} as never)).resolves.toEqual(offscreenSessions);

    expect(harness.sendMessage).toHaveBeenNthCalledWith(1, {
      type: "OFFSCREEN_START_SESSION",
      payload: startSessionPayload
    });
    expect(harness.sendMessage).toHaveBeenNthCalledWith(2, {
      type: "OFFSCREEN_SET_GAIN",
      payload: { tabId: 7, gainPercent: 260 }
    });
    expect(harness.sendMessage).toHaveBeenNthCalledWith(3, {
      type: "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS",
      payload: {} as never
    });
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
