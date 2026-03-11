import { createDefaultBoostSettingsBundle } from "../../../shared/boost-settings";
import { createDefaultSessionBoostState } from "../../../shared/session-boost/create-default-session-boost-state";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncSessionBoostAcrossRuntime } from "./sync-session-boost-across-runtime";

export async function resetSessionBoostOnAllSites(runtime: WorkerRuntimeState): Promise<void> {
  await runtime.settingsRepository.setGlobalBoostSettingsBundle(createDefaultBoostSettingsBundle());
  await runtime.settingsRepository.clearDomainBoostSettingsBundles();
  await runtime.sessionBoostRepository.setState(createDefaultSessionBoostState());
  await syncSessionBoostAcrossRuntime(runtime);
}
