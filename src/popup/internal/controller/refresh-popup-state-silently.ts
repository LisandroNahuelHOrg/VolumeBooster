import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import type { PopupStatePollContext } from "./popup-state-poll-context";

export async function refreshPopupStateSilently(
  context: PopupStatePollContext
): Promise<void> {
  const response = await sendMessageSafe<WorkerState>({ type: "GET_STATE" });

  if (!response.ok || !response.data) {
    return;
  }

  await applyPopupWorkerState(context.refs, context.state, response.data);
}
