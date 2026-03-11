import { it, expect, vi } from "vitest";
import { sendOffscreenMessage } from "../send-offscreen-message";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("stops retrying after the allowed attempts when the receiver keeps missing", async () => {
  const harness = createOffscreenClientTestHarness();
  const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

  try {
    harness.getContexts.mockResolvedValue([]);
    harness.sendMessage.mockRejectedValue(new Error("Could not establish connection. Receiving end does not exist."));

    await expect(sendOffscreenMessage({ type: "OFFSCREEN_GET_SNAPSHOT" }, 2)).rejects.toThrow(
      "Receiving end does not exist"
    );

    expect(harness.createDocument).toHaveBeenCalledTimes(1);
    expect(harness.sendMessage).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
