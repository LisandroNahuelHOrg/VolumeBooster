import { recordGainTrackPointerMove } from "../dom/record-gain-track-pointer-move";
import { popupRootPointerContextRegistry } from "./popup-root-pointer-context-registry";

export function dispatchRootPointerMove(event: PointerEvent): void {
  const currentTarget = event.currentTarget;

  if (!currentTarget) {
    return;
  }

  const context = popupRootPointerContextRegistry.get(currentTarget);

  if (context) {
    recordGainTrackPointerMove(event.pointerId, event.clientX, context.popupGainPointerRuntime);
  }
}
