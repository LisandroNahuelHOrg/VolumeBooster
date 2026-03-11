import { it, expect, vi } from "vitest";
import { sendOffscreenMessage } from "../send-offscreen-message";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("throws the undeliverable fallback when the retry loop is bypassed", async () => {
  createOffscreenClientTestHarness();

  try {
    await expect(sendOffscreenMessage({ type: "OFFSCREEN_GET_SNAPSHOT" }, 0)).rejects.toEqual({
      key: "errorOffscreenMessageUndeliverable"
    });
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
