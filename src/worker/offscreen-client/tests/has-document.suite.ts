import { OFFSCREEN_DOCUMENT_PATH } from "../../../shared/constants";
import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("reports whether the offscreen document exists", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await expect(harness.client.hasDocument()).resolves.toBe(true);
    expect(harness.getContexts).toHaveBeenNthCalledWith(1, {
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [`chrome-extension://extension/${OFFSCREEN_DOCUMENT_PATH}`]
    });

    harness.getContexts.mockResolvedValueOnce([]);
    await expect(harness.client.hasDocument()).resolves.toBe(false);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
