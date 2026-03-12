import type { PopupRootChangeContext } from "./popup-root-event-context";

export const popupRootChangeContextRegistry = new WeakMap<EventTarget, PopupRootChangeContext>();
