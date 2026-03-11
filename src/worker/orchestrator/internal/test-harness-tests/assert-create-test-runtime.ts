import { SettingsRepository } from "../../../../shared/storage";
import { createTestRuntime } from "../../test-harness";

it("createTestRuntime_wires_fixed_time_shared_settings_storage_and_mocked_clients", async () => {
  const { runtime, storage, offscreenClient, autoBoosterClient } = createTestRuntime(37);

  expect(storage).toBeInstanceOf(SettingsRepository);
  expect(runtime.settingsRepository).toBe(storage);
  expect(runtime.offscreenClient).toBe(offscreenClient);
  expect(runtime.autoBoosterClient).toBe(autoBoosterClient);
  expect(runtime.now()).toBe(37);
  expect(vi.isMockFunction(offscreenClient.getSnapshot)).toBe(true);
  expect(vi.isMockFunction(autoBoosterClient.requestGlobalPermission)).toBe(true);

  await storage.setAutoBoosterMode("global");

  expect(await runtime.settingsRepository.getAutoBoosterMode()).toBe("global");
});
