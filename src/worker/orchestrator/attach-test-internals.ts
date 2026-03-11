import type { CaptureSessionState } from "../../shared/types";
import type { WorkerRuntimeState } from "./runtime-state";
import { syncActionBadges } from "./badge/sync-action-badges";
import { syncBadgePulseTimer } from "./badge/sync-badge-pulse-timer";
import { handleOffscreenEvent } from "./lifecycle/handle-offscreen-event";
import { replaceManualSessions } from "./manual/replace-manual-sessions";

export function attachTestInternals(target: object, runtime: WorkerRuntimeState): void {
  Object.defineProperties(target, {
    sessions: { get: () => runtime.sessions },
    manualSessions: { get: () => runtime.manualSessions },
    autoSessions: { get: () => runtime.autoSessions },
    autoTabStates: { get: () => runtime.autoTabStates },
    autoDebugStates: { get: () => runtime.autoDebugStates },
    audibleTabs: { get: () => runtime.audibleTabs },
    badgedTabs: { get: () => runtime.badgedTabs },
    badgePulseTimer: { get: () => runtime.badgePulseTimer },
    badgePulseHighlighted: {
      get: () => runtime.badgePulseHighlighted,
      set: (value: boolean) => {
        runtime.badgePulseHighlighted = value;
      }
    }
  });

  Object.assign(target, {
    replaceManualSessions: (sessions: CaptureSessionState[]) => replaceManualSessions(runtime, sessions),
    handleOffscreenEvent: (message: unknown) => handleOffscreenEvent(runtime, message),
    syncActionBadges: () => syncActionBadges(runtime),
    syncBadgePulseTimer: () => syncBadgePulseTimer(runtime)
  });
}
