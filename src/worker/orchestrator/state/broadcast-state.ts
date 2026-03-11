import type { WorkerState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncActionBadges } from "../badge/sync-action-badges";
import { getState } from "./get-state";

export async function broadcastState(runtime: WorkerRuntimeState): Promise<WorkerState> {
  const state = await getState(runtime);
  await syncActionBadges(runtime);

  try {
    await chrome.runtime.sendMessage({ type: "WORKER_STATE_UPDATE", payload: state });
  } catch {
    // The popup may be closed; that is fine.
  }

  return state;
}
