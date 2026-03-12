import { it, expect, vi } from "vitest";
import { createOffscreenClientTestHarness } from "./create-offscreen-client-test-harness";

it("closes only when there are no sessions left and the document exists", async () => {
  const harness = createOffscreenClientTestHarness();

  try {
    harness.getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await harness.client.closeIfIdle(0);
    expect(harness.closeDocument).toHaveBeenCalledTimes(1);

    await harness.client.closeIfIdle(2);
    expect(harness.closeDocument).toHaveBeenCalledTimes(1);

    harness.getContexts.mockResolvedValueOnce([]);
    await harness.client.closeIfIdle(0);
    expect(harness.closeDocument).toHaveBeenCalledTimes(1);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
