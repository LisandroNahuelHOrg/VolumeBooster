import type { ContentCommand } from "./content-command";
import type { ContentEvent } from "./content-event";
import type { OffscreenCommand } from "./offscreen-command";
import type { OffscreenEvent } from "./offscreen-event";
import type { PopupCommand } from "./popup-command";
import type { WorkerEvent } from "./worker-event";

export type ExtensionMessage =
  | PopupCommand
  | OffscreenCommand
  | ContentCommand
  | WorkerEvent
  | OffscreenEvent
  | ContentEvent;
