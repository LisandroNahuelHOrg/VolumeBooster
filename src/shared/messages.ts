/**
 * @fileoverview Typed runtime-message contracts and helpers shared by every
 * extension context.
 * @module shared/messages
 */

export type { PopupCommand } from "./messages/popup-command";
export type { OffscreenCommand } from "./messages/offscreen-command";
export type { ContentCommand } from "./messages/content-command";
export type { WorkerEvent } from "./messages/worker-event";
export type { OffscreenEvent } from "./messages/offscreen-event";
export type { ContentEvent } from "./messages/content-event";
export type { ExtensionMessage } from "./messages/extension-message";
export type { DebugStateResponse } from "./messages/debug-state-response";
export { isPopupCommand } from "./messages/is-popup-command";
export { isOffscreenCommand } from "./messages/is-offscreen-command";
export { isContentCommand } from "./messages/is-content-command";
export { isOffscreenEvent } from "./messages/is-offscreen-event";
export { isContentEvent } from "./messages/is-content-event";
export { okRuntimeResponse as ok } from "./messages/ok-runtime-response";
export { failRuntimeResponse as fail } from "./messages/fail-runtime-response";
export { createLocalizedMessage as message } from "./messages/create-localized-message";
export { isLocalizedMessage } from "./messages/is-localized-message";
export { sendExtensionMessage as sendMessage } from "./messages/send-extension-message";
export { sendExtensionMessageSafe as sendMessageSafe } from "./messages/send-extension-message-safe";
