import { createAutoBoosterClientTestHarness } from "./create-test-harness";
import { AUTO_CONFIG_PAYLOAD, SITE_CONFIG_PAYLOAD } from "./test-payloads";

export function registerConfigureAndDisableTests(): void {
  describe("AutoBoosterClient configure and disable", () => {
    let harness: ReturnType<typeof createAutoBoosterClientTestHarness>;

    beforeEach(() => {
      harness = createAutoBoosterClientTestHarness();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it("injects the content script and configures the tab", async () => {
      harness.sendMessage.mockResolvedValueOnce(undefined);
      await harness.client.configure(14, AUTO_CONFIG_PAYLOAD);

      expect(harness.executeScript).toHaveBeenCalledTimes(2);
      expect(harness.executeScript).toHaveBeenNthCalledWith(1, {
        target: { tabId: 14, allFrames: true },
        files: ["content-scripts/auto-booster-isolated.js"]
      });
      expect(harness.executeScript).toHaveBeenNthCalledWith(2, {
        target: { tabId: 14, allFrames: true },
        files: ["content-scripts/auto-booster-main.js"],
        world: "MAIN"
      });
      expect(harness.sendMessage).toHaveBeenNthCalledWith(1, 14, {
        type: "AUTO_BOOSTER_CONFIGURE",
        payload: AUTO_CONFIG_PAYLOAD
      });
    });

    it("normalizes permission errors and attach failures", async () => {
      harness.executeScript.mockRejectedValue(new Error("Cannot access contents of the page."));
      await expect(harness.client.configure(3, SITE_CONFIG_PAYLOAD)).rejects.toEqual({ key: "errorAutoPermissionMissing" });

      harness.executeScript.mockReset();
      harness.executeScript.mockResolvedValueOnce(undefined);
      harness.sendMessage.mockRejectedValueOnce(new Error("Boom"));

      await expect(harness.client.configure(3, SITE_CONFIG_PAYLOAD)).rejects.toEqual({ key: "errorAutoAttachFailed" });
    });

    it("sends the disable command and swallows failures during teardown", async () => {
      harness.sendMessage.mockResolvedValueOnce(undefined);
      await expect(harness.client.disable(9)).resolves.toBeUndefined();
      expect(harness.sendMessage).toHaveBeenNthCalledWith(1, 9, {
        type: "AUTO_BOOSTER_DISABLE",
        payload: { tabId: 9 }
      });

      harness.sendMessage.mockRejectedValueOnce(new Error("Receiver missing"));
      await expect(harness.client.disable(9)).resolves.toBeUndefined();
      expect(harness.sendMessage).toHaveBeenNthCalledWith(2, 9, {
        type: "AUTO_BOOSTER_DISABLE",
        payload: { tabId: 9 }
      });
    });
  });
}
