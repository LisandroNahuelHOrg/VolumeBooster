import { afterEach, expect, test, vi } from "vitest";
import { createTestRuntime } from "../internal/test-harness/create-test-runtime";
import { enableGlobalAutoBooster } from "./enable-global-auto-booster";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("enables all-sites mode without requesting permission again when global access is already available", async () => {
  const harness = createTestRuntime();

  vi.stubGlobal("chrome", {
    tabs: {
      get: vi.fn().mockResolvedValue({
        id: 7,
        title: "Video",
        url: "https://video.example/watch"
      })
    }
  } as unknown as typeof chrome);
  harness.autoBoosterClient.hasGlobalPermission.mockResolvedValue(true);
  harness.autoBoosterClient.requestGlobalPermission.mockResolvedValue(false);
  harness.autoBoosterClient.queryInjectableTabs.mockResolvedValue([]);

  await expect(enableGlobalAutoBooster(harness.runtime, 7, 260)).resolves.toBeUndefined();

  expect(harness.autoBoosterClient.requestGlobalPermission).not.toHaveBeenCalled();
  expect(harness.autoBoosterClient.configure).toHaveBeenCalledWith(
    7,
    expect.objectContaining({
      scope: "global",
      gainPercent: 260,
      enabled: true
    })
  );
  expect(await harness.storage.getAutoBoosterMode()).toBe("global");
});

test("fails immediately when all-sites access is still unavailable", async () => {
  const harness = createTestRuntime();

  harness.autoBoosterClient.hasGlobalPermission.mockResolvedValue(false);
  harness.autoBoosterClient.requestGlobalPermission.mockResolvedValue(true);

  await expect(enableGlobalAutoBooster(harness.runtime, 7, 260)).rejects.toEqual({
    key: "errorAutoGlobalPermissionDenied"
  });

  expect(harness.autoBoosterClient.requestGlobalPermission).not.toHaveBeenCalled();
});
