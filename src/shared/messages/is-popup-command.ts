import type { PopupCommand } from "./popup-command";
import { hasMessageType } from "./has-message-type";
import { popupCommandTypes } from "./popup-command-types";

export function isPopupCommand(message: unknown): message is PopupCommand {
  return hasMessageType(message) && popupCommandTypes.includes(message.type as (typeof popupCommandTypes)[number]);
}
