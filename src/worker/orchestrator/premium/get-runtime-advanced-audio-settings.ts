import { sanitizeAdvancedAudioSettingsForEntitlement } from "../../../shared/premium-license";
import type { WorkerRuntimeState } from "../runtime-state";

export async function getRuntimeAdvancedAudioSettings(runtime: WorkerRuntimeState) {
  return sanitizeAdvancedAudioSettingsForEntitlement(
    await runtime.settingsRepository.getAdvancedAudioSettings(),
    runtime.premiumEntitlement
  );
}
