import type { OffscreenClient } from "./offscreen-client-contract";
import { closeOffscreenDocumentIfIdle } from "./close-offscreen-document-if-idle";
import { ensureOffscreenDocument } from "./ensure-offscreen-document";
import { getOffscreenSnapshot } from "./get-offscreen-snapshot";
import { hasOffscreenDocument } from "./has-offscreen-document";
import { setOffscreenAdvancedAudioSettings } from "./set-offscreen-advanced-audio-settings";
import { setOffscreenGain } from "./set-offscreen-gain";
import { startOffscreenSession } from "./start-offscreen-session";
import { stopAllOffscreenSessions } from "./stop-all-offscreen-sessions";
import { stopOffscreenSession } from "./stop-offscreen-session";
import { updateOffscreenMetadata } from "./update-offscreen-metadata";

export function createOffscreenClient(): OffscreenClient {
  return {
    ensureDocument: ensureOffscreenDocument,
    hasDocument: hasOffscreenDocument,
    getSnapshot: getOffscreenSnapshot,
    startSession: startOffscreenSession,
    setGain: setOffscreenGain,
    setAdvancedAudioSettings: setOffscreenAdvancedAudioSettings,
    updateMetadata: updateOffscreenMetadata,
    stopSession: stopOffscreenSession,
    stopAll: stopAllOffscreenSessions,
    closeIfIdle: closeOffscreenDocumentIfIdle
  };
}
