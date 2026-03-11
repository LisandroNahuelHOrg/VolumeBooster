import type { CaptureSessionState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { normalizeManualSession } from "./normalize-manual-session";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";

export function replaceManualSessions(runtime: WorkerRuntimeState, sessions: CaptureSessionState[]): void {
  runtime.manualSessions.clear();

  for (const session of sessions) {
    runtime.manualSessions.set(session.tabId, normalizeManualSession(session));
  }

  rebuildEffectiveSessions(runtime);
}
