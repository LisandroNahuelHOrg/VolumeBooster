import { createAutoBoosterClientTestHarness } from "./create-test-harness";
import { FRAME_CONFIG_PAYLOAD, FRAME_TARGET } from "./test-payloads";

export function registerDebugAndFrameTargetingTests(): void {
  describe("AutoBoosterClient debug state and frame targeting", () => {
    let harness: ReturnType<typeof createAutoBoosterClientTestHarness>;

    beforeEach(() => {
      harness = createAutoBoosterClientTestHarness();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it("returns null debug state when injection fails", async () => {
      harness.executeScript.mockRejectedValueOnce(new Error("Cannot access contents of the page."));
      await expect(harness.client.getDebugState(9)).resolves.toBeNull();
    });

    it("targets specific frames directly and forwards document ids without reinjecting the tab", async () => {
      harness.sendMessage
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ attachState: "attached" });

      await harness.client.configure(31, FRAME_CONFIG_PAYLOAD, FRAME_TARGET);
      await harness.client.disable(31, FRAME_TARGET);
      await expect(harness.client.getDebugState(31, FRAME_TARGET)).resolves.toEqual({ attachState: "attached" });

      expect(harness.executeScript).not.toHaveBeenCalled();
      expect(harness.sendMessage).toHaveBeenNthCalledWith(1, 31, {
        type: "AUTO_BOOSTER_CONFIGURE",
        payload: FRAME_CONFIG_PAYLOAD
      }, FRAME_TARGET);
      expect(harness.sendMessage).toHaveBeenNthCalledWith(2, 31, {
        type: "AUTO_BOOSTER_DISABLE",
        payload: { tabId: 31 }
      }, FRAME_TARGET);
      expect(harness.sendMessage).toHaveBeenNthCalledWith(3, 31, {
        type: "AUTO_BOOSTER_GET_DEBUG_STATE"
      }, FRAME_TARGET);
    });

    it("normalizes missing frame debug responses to null", async () => {
      harness.sendMessage.mockResolvedValueOnce(undefined);
      await expect(harness.client.getDebugState(52, { frameId: 9 })).resolves.toBeNull();
    });
  });
}
