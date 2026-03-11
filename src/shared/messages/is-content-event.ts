import type { ContentEvent } from "./content-event";
import { contentEventTypes } from "./content-event-types";
import { hasMessageType } from "./has-message-type";

export function isContentEvent(message: unknown): message is ContentEvent {
  return hasMessageType(message) && contentEventTypes.includes(message.type as (typeof contentEventTypes)[number]);
}
