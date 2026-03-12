import { popupStatePollContextRegistry } from "./popup-state-poll-context-registry";
import { refreshPopupStateSilently } from "./refresh-popup-state-silently";

export function runPopupStatePollTick(pollId: number): void {
  const context = popupStatePollContextRegistry.get(pollId);

  if (!context) {
    return;
  }

  void refreshPopupStateSilently(context);
}
