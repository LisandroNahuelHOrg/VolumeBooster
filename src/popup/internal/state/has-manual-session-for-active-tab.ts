import type { WorkerState } from "../../../shared/types";

export function hasManualSessionForActiveTab(
  state: WorkerState | null | undefined,
  tabId: number | undefined
): boolean {
  if (!state || typeof tabId !== "number") {
    return false;
  }

  return state.sessions.some((session) => session.tabId === tabId && session.engineLane === "manual_tab_capture");
}
