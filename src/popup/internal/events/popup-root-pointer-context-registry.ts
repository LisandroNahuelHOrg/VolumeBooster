import type { PopupRootPointerContext } from "./popup-root-event-context";

export const popupRootPointerContextRegistry = new WeakMap<EventTarget, PopupRootPointerContext>();
