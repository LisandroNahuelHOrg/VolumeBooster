import type { ContentCommand } from "./content-command";
import { contentCommandTypes } from "./content-command-types";
import { hasMessageType } from "./has-message-type";

export function isContentCommand(message: unknown): message is ContentCommand {
  return hasMessageType(message) && contentCommandTypes.includes(message.type as (typeof contentCommandTypes)[number]);
}
