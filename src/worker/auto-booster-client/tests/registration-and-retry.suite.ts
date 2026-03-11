import { createAutoBoosterClientTestHarness } from "./create-test-harness";
import { AUTO_CONFIG_PAYLOAD } from "./test-payloads";

export function registerRegistrationAndRetryTests(): void {
  describe("AutoBoosterClient registration and retry behavior", () => {
    let harness: ReturnType<typeof createAutoBoosterClientTestHarness>;

    beforeEach(() => {
      harness = createAutoBoosterClientTestHarness();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it("retries once when the content script receiver is missing", async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      harness.sendMessage
        .mockRejectedValueOnce(new Error("Receiving end does not exist."))
        .mockResolvedValueOnce(undefined);

      await harness.client.configure(8, { ...AUTO_CONFIG_PAYLOAD, tabId: 8, gainPercent: 160 });

      expect(harness.executeScript).toHaveBeenCalledTimes(4);
      expect(harness.sendMessage).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
    });

    it("stops retrying after the receiver never appears", async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      harness.executeScript.mockResolvedValue(undefined);
      harness.sendMessage.mockRejectedValue(new Error("Receiving end does not exist."));

      await expect(harness.client.configure(11, { ...AUTO_CONFIG_PAYLOAD, tabId: 11 })).rejects.toEqual({
        key: "errorAutoAttachFailed"
      });

      expect(harness.sendMessage).toHaveBeenCalledTimes(2);
      expect(harness.executeScript).toHaveBeenCalledTimes(4);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
    });

    it("registers and unregisters the global content scripts", async () => {
      await harness.client.registerGlobalContentScripts();
      await harness.client.unregisterGlobalContentScripts();

      expect(harness.unregisterContentScripts).toHaveBeenNthCalledWith(1, {
        ids: ["prism-auto-booster-isolated", "prism-auto-booster-main"]
      });
      expect(harness.registerContentScripts).toHaveBeenCalledWith([
        {
          id: "prism-auto-booster-isolated",
          js: ["content-scripts/auto-booster-isolated.js"],
          matches: ["http://*/*", "https://*/*"],
          allFrames: true,
          matchOriginAsFallback: true,
          persistAcrossSessions: true,
          runAt: "document_start",
          world: "ISOLATED"
        },
        {
          id: "prism-auto-booster-main",
          js: ["content-scripts/auto-booster-main.js"],
          matches: ["http://*/*", "https://*/*"],
          allFrames: true,
          matchOriginAsFallback: true,
          persistAcrossSessions: true,
          runAt: "document_start",
          world: "MAIN"
        }
      ]);
      expect(harness.unregisterContentScripts).toHaveBeenNthCalledWith(2, {
        ids: ["prism-auto-booster-isolated", "prism-auto-booster-main"]
      });
    });

    it("returns safe fallbacks when registration APIs are unavailable", async () => {
      const chromeWithMissingApis = chrome as unknown as {
        scripting: {
          registerContentScripts?: typeof harness.registerContentScripts;
        };
      };

      chromeWithMissingApis.scripting.registerContentScripts = undefined;
      harness.unregisterContentScripts.mockRejectedValueOnce(new Error("not registered"));

      await expect(harness.client.registerGlobalContentScripts()).resolves.toBeUndefined();
      await expect(harness.client.unregisterGlobalContentScripts()).resolves.toBeUndefined();
    });

    it("falls back to top-frame-only injection when all-frame injection fails", async () => {
      harness.executeScript.mockRejectedValueOnce(new Error("all frames blocked"));
      harness.executeScript.mockResolvedValue(undefined);

      await expect(harness.client.injectRegisteredScriptsIntoTab(44)).resolves.toBeUndefined();

      expect(harness.executeScript).toHaveBeenNthCalledWith(1, {
        target: { tabId: 44, allFrames: true },
        files: ["content-scripts/auto-booster-isolated.js"]
      });
      expect(harness.executeScript).toHaveBeenNthCalledWith(2, {
        target: { tabId: 44, allFrames: true },
        files: ["content-scripts/auto-booster-main.js"],
        world: "MAIN"
      });
      expect(harness.executeScript).toHaveBeenNthCalledWith(3, {
        target: { tabId: 44, allFrames: false },
        files: ["content-scripts/auto-booster-isolated.js"]
      });
      expect(harness.executeScript).toHaveBeenNthCalledWith(4, {
        target: { tabId: 44, allFrames: false },
        files: ["content-scripts/auto-booster-main.js"],
        world: "MAIN"
      });
    });
  });
}
