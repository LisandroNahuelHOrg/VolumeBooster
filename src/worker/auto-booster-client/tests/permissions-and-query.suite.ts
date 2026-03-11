import { createAutoBoosterClientTestHarness } from "./create-test-harness";

export function registerPermissionsAndQueryTests(): void {
  describe("AutoBoosterClient permissions and query helpers", () => {
    let harness: ReturnType<typeof createAutoBoosterClientTestHarness>;

    beforeEach(() => {
      harness = createAutoBoosterClientTestHarness();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it("queries permissions and injectable tabs through chrome APIs", async () => {
      harness.requestPermission.mockResolvedValueOnce(true);
      harness.containsPermission.mockResolvedValueOnce(true);
      harness.queryTabs.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      await expect(harness.client.requestGlobalPermission()).resolves.toBe(true);
      await expect(harness.client.hasGlobalPermission()).resolves.toBe(true);
      await expect(harness.client.queryInjectableTabs()).resolves.toEqual([{ id: 1 }, { id: 2 }]);

      expect(harness.requestPermission).toHaveBeenCalledWith({ origins: ["<all_urls>"] });
      expect(harness.containsPermission).toHaveBeenCalledWith({ origins: ["<all_urls>"] });
      expect(harness.queryTabs).toHaveBeenCalledWith({ url: ["http://*/*", "https://*/*"] });
    });

    it("returns safe fallbacks when host-access recovery APIs are unavailable or tabs query fails", async () => {
      const chromeWithMissingApis = chrome as unknown as {
        permissions: {
          request?: typeof harness.requestPermission;
          contains?: typeof harness.containsPermission;
        };
      };

      chromeWithMissingApis.permissions.request = undefined;
      chromeWithMissingApis.permissions.contains = undefined;
      harness.queryTabs.mockRejectedValueOnce(new Error("tabs unavailable"));

      await expect(harness.client.requestGlobalPermission()).resolves.toBe(false);
      await expect(harness.client.hasGlobalPermission()).resolves.toBe(false);
      await expect(harness.client.queryInjectableTabs()).resolves.toEqual([]);
    });
  });
}
