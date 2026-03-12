import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";
import { startSessionPayload } from "./test-payloads.suite";

it("falls back to default localized errors when the offscreen response has no error payload", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    harness.sendMessage.mockResolvedValue({ ok: false });

    await expect(harness.client.startSession(startSessionPayload)).rejects.toEqual({ key: "errorOffscreenStartSession" });
    await expect(harness.client.setGain(1, 200)).rejects.toEqual({ key: "errorOffscreenSetGain" });
    await expect(harness.client.setAdvancedAudioSettings({} as never)).rejects.toEqual({
      key: "errorOffscreenSetAudioSettings"
    });
    await expect(
      harness.client.updateMetadata({ tabId: 1, title: "x", url: "https://x.com", domain: "x.com" })
    ).rejects.toEqual({ key: "errorOffscreenUpdateMetadata" });
    await expect(harness.client.stopSession(1)).rejects.toEqual({ key: "errorOffscreenStopSession" });
    await expect(harness.client.stopAll()).rejects.toEqual({ key: "errorOffscreenStopAll" });
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
