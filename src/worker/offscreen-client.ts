/**
 * @fileoverview Client wrapper around runtime messages sent to the offscreen
 * document that owns manual tab-capture sessions.
 * @module worker/offscreen-client
 */
export type { OffscreenClient } from "./offscreen-client/offscreen-client-contract";
export { createOffscreenClient } from "./offscreen-client/create-offscreen-client";
