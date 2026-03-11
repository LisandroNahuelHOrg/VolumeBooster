import type { OffscreenCommand } from "./offscreen-command";
import { hasMessageType } from "./has-message-type";
import { offscreenCommandTypes } from "./offscreen-command-types";

export function isOffscreenCommand(message: unknown): message is OffscreenCommand {
  return hasMessageType(message) && offscreenCommandTypes.includes(message.type as (typeof offscreenCommandTypes)[number]);
}
