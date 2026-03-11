import {
  sanitizeAdvancedAudioSettings
} from "../../../shared/audio-settings";
import type { AdvancedAudioSettings } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncConfiguredAutoTabs } from "../auto/sync-configured-auto-tabs";
import { broadcastState } from "../state/broadcast-state";
import { replaceManualSessions } from "./replace-manual-sessions";

export async function setAdvancedAudioSettings(
  runtime: WorkerRuntimeState,
  partialSettings: Partial<AdvancedAudioSettings>
): Promise<void> {
  const persistedSettings = await runtime.settingsRepository.setAdvancedAudioSettings(
    sanitizeAdvancedAudioSettings({
      ...(await runtime.settingsRepository.getAdvancedAudioSettings()),
      ...partialSettings
    })
  );

  if (runtime.manualSessions.size > 0) {
    const snapshot = await runtime.offscreenClient.setAdvancedAudioSettings(persistedSettings);
    replaceManualSessions(runtime, snapshot);
  }

  await syncConfiguredAutoTabs(runtime, persistedSettings);
  await broadcastState(runtime);
}
