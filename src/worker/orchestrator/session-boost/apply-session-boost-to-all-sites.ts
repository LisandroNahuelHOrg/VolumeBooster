import { createDefaultSessionBoostState } from "../../../shared/session-boost/create-default-session-boost-state";
import type { WorkerRuntimeState } from "../runtime-state";
import { resolveEffectiveBoostSettingsBundle } from "./resolve-effective-boost-settings-bundle";
import { syncSessionBoostAcrossRuntime } from "./sync-session-boost-across-runtime";

export async function applySessionBoostToAllSites(runtime: WorkerRuntimeState, domain?: string): Promise<void> {
  const settings = await runtime.settingsRepository.getSettings();
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  const bundle = resolveEffectiveBoostSettingsBundle(settings, sessionBoostState, domain);

  await runtime.settingsRepository.setGlobalBoostSettingsBundle(bundle);
  await runtime.settingsRepository.clearDomainBoostSettingsBundles();
  await runtime.sessionBoostRepository.setState(createDefaultSessionBoostState());
  await syncSessionBoostAcrossRuntime(runtime);
}
