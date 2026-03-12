import type { PopupRootInputContext } from "./popup-root-event-context";

export const popupRootInputContextRegistry = new WeakMap<EventTarget, PopupRootInputContext>();
