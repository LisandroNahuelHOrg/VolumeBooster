import { OFFSCREEN_DOCUMENT_PATH, OFFSCREEN_JUSTIFICATION } from "../../../shared/constants";
import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("creates the offscreen document only when missing", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValueOnce([]);
    await harness.client.ensureDocument();
    expect(harness.createDocument).toHaveBeenCalledTimes(1);
    expect(harness.getContexts).toHaveBeenNthCalledWith(1, {
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [`chrome-extension://extension/${OFFSCREEN_DOCUMENT_PATH}`]
    });
    expect(harness.createDocument).toHaveBeenCalledWith({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["USER_MEDIA"],
      justification: OFFSCREEN_JUSTIFICATION
    });

    harness.getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await harness.client.ensureDocument();
    expect(harness.createDocument).toHaveBeenCalledTimes(1);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
