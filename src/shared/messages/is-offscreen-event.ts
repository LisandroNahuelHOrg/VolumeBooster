import type { OffscreenEvent } from "./offscreen-event";
import { hasMessageType } from "./has-message-type";
import { offscreenEventTypes } from "./offscreen-event-types";

export function isOffscreenEvent(message: unknown): message is OffscreenEvent {
  return hasMessageType(message) && offscreenEventTypes.includes(message.type as (typeof offscreenEventTypes)[number]);
}
