import { ACTION_BADGE_PULSE_MS } from "../constants";
import type { WorkerRuntimeState } from "../runtime-state";
import { pruneAudibleTabs } from "./prune-audible-tabs";
import { stopBadgePulseTimer } from "./stop-badge-pulse-timer";
import { syncActionBadges } from "./sync-action-badges";

export function syncBadgePulseTimer(runtime: WorkerRuntimeState): void {
  if (runtime.audibleTabs.size > 0) {
    if (runtime.badgePulseTimer !== null) {
      return;
    }

    runtime.badgePulseHighlighted = false;
    runtime.badgePulseTimer = globalThis.setInterval(() => {
      pruneAudibleTabs(runtime);

      if (runtime.audibleTabs.size === 0) {
        stopBadgePulseTimer(runtime);
        void syncActionBadges(runtime);
        return;
      }

      runtime.badgePulseHighlighted = !runtime.badgePulseHighlighted;
      void syncActionBadges(runtime);
    }, ACTION_BADGE_PULSE_MS);
    return;
  }

  stopBadgePulseTimer(runtime);
}
