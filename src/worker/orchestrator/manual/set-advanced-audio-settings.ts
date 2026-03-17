import {
  sanitizeAdvancedAudioSettingsForEntitlement
} from "../../../shared/premium-license";
import type { AdvancedAudioSettings } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncConfiguredAutoTabs } from "../auto/sync-configured-auto-tabs";
import { broadcastState } from "../state/broadcast-state";
import { replaceManualSessions } from "./replace-manual-sessions";

export async function setAdvancedAudioSettings(
  runtime: WorkerRuntimeState,
  partialSettings: Partial<AdvancedAudioSettings>
): Promise<void> {
  const persistedSettings =
    await runtime.settingsRepository.setAdvancedAudioSettings(partialSettings);
  const effectiveRuntimeSettings = sanitizeAdvancedAudioSettingsForEntitlement(
    persistedSettings,
    runtime.premiumEntitlement
  );

  if (runtime.manualSessions.size > 0) {
    const snapshot = await runtime.offscreenClient.setAdvancedAudioSettings(
      effectiveRuntimeSettings
    );
    replaceManualSessions(runtime, snapshot);
  }

  await syncConfiguredAutoTabs(runtime);
  await broadcastState(runtime);
}
