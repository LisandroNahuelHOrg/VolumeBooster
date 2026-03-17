import { createAutoBoosterClientTestHarness } from "./create-test-harness";

export function registerPermissionRecoveryIdempotencyTests(): void {
  describe("AutoBoosterClient global permission recovery idempotency", () => {
    let harness: ReturnType<typeof createAutoBoosterClientTestHarness>;

    beforeEach(() => {
      harness = createAutoBoosterClientTestHarness();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it("returns success without re-requesting when all-sites access already exists", async () => {
      harness.containsPermission.mockResolvedValueOnce(true);

      await expect(harness.client.requestGlobalPermission()).resolves.toBe(true);

      expect(harness.requestPermission).not.toHaveBeenCalled();
    });

    it("treats recovery as failed when request resolves but all-sites access is still missing", async () => {
      harness.containsPermission.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
      harness.requestPermission.mockResolvedValueOnce(true);

      await expect(harness.client.requestGlobalPermission()).resolves.toBe(false);

      expect(harness.requestPermission).toHaveBeenCalledWith({ origins: ["<all_urls>"] });
    });

    it("returns false when the recovery request throws", async () => {
      harness.containsPermission.mockResolvedValueOnce(false);
      harness.requestPermission.mockRejectedValueOnce(new Error("permission api failed"));

      await expect(harness.client.requestGlobalPermission()).resolves.toBe(false);
    });
  });
}
