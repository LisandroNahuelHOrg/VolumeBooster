import { ACTION_BADGE_AUDIBLE_HOLD_MS, ACTION_BADGE_AUDIBLE_THRESHOLD } from "../constants";
import type { WorkerRuntimeState } from "../runtime-state";
import { isTabAudible } from "./is-tab-audible";
import { syncBadgePulseTimer } from "./sync-badge-pulse-timer";

export function updateAudibleState(runtime: WorkerRuntimeState, tabId: number, level: number): boolean {
  const wasAudible = isTabAudible(runtime, tabId);
  const currentSession = runtime.sessions.get(tabId);

  if (!currentSession || currentSession.streamState !== "active") {
    runtime.audibleTabs.delete(tabId);
    syncBadgePulseTimer(runtime);
    return wasAudible;
  }

  if (level >= ACTION_BADGE_AUDIBLE_THRESHOLD) {
    runtime.audibleTabs.set(tabId, runtime.now() + ACTION_BADGE_AUDIBLE_HOLD_MS);
  } else {
    const audibleUntil = runtime.audibleTabs.get(tabId) ?? 0;

    if (audibleUntil <= runtime.now()) {
      runtime.audibleTabs.delete(tabId);
    }
  }

  syncBadgePulseTimer(runtime);
  return wasAudible !== isTabAudible(runtime, tabId);
}
