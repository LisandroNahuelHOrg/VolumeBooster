import type { PopupRootClickContext } from "./popup-root-event-context";

export const popupRootClickContextRegistry = new WeakMap<EventTarget, PopupRootClickContext>();
