import type { WorkerState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { getCurrentTabSummary } from "./get-current-tab-summary";
import { syncFromOffscreen } from "../manual/sync-from-offscreen";

export async function getState(runtime: WorkerRuntimeState): Promise<WorkerState> {
  await syncFromOffscreen(runtime);
  const currentTab = await getCurrentTabSummary(runtime);
  const advancedAudioSettings = await runtime.settingsRepository.getAdvancedAudioSettings();
  const globalAutoGainPercent = await runtime.settingsRepository.getGlobalAutoGainPercent();
  const hasGlobalPermission =
    typeof runtime.autoBoosterClient.hasGlobalPermission === "function"
      ? await runtime.autoBoosterClient.hasGlobalPermission()
      : false;

  return {
    currentTab,
    advancedAudioSettings,
    autoBoosterMode: runtime.autoBoosterMode,
    globalAutoGainPercent,
    hasGlobalPermission,
    sessions: [...runtime.sessions.values()],
    generatedAt: runtime.now()
  };
}
