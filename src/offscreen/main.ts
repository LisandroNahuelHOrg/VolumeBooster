/**
 * @fileoverview Entry point del documento offscreen que delega el control de
 * sesiones capturadas al session manager.
 */
import { isOffscreenCommand } from "../shared/messages";
import { fail, message } from "../shared/messages";
import { captureExceptionSafe, initSentryForContext } from "../shared/observability/sentry";
import { setDocumentLocaleAttributes, t } from "../shared/runtime-i18n";
import { createOffscreenSessionManager } from "./session-manager";

initSentryForContext("offscreen");

const manager = createOffscreenSessionManager();
setDocumentLocaleAttributes(document);
document.title = t("offscreenDocumentTitle");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isOffscreenCommand(message)) {
    return false;
  }

  switch (message.type) {
    case "OFFSCREEN_START_SESSION":
      return respondToCommand(manager.startSession(message.payload), "OFFSCREEN_START_SESSION", sendResponse);
    case "OFFSCREEN_SET_GAIN":
      return respondToCommand(
        manager.setGain(message.payload.tabId, message.payload.gainPercent),
        "OFFSCREEN_SET_GAIN",
        sendResponse
      );
    case "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS":
      return respondToCommand(
        manager.setAdvancedAudioSettings(message.payload),
        "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS",
        sendResponse
      );
    case "OFFSCREEN_STOP_SESSION":
      return respondToCommand(manager.stopSession(message.payload.tabId), "OFFSCREEN_STOP_SESSION", sendResponse);
    case "OFFSCREEN_STOP_ALL":
      return respondToCommand(manager.stopAll(), "OFFSCREEN_STOP_ALL", sendResponse);
    case "OFFSCREEN_UPDATE_METADATA":
      return respondToCommand(manager.updateMetadata(message.payload), "OFFSCREEN_UPDATE_METADATA", sendResponse);
    case "OFFSCREEN_GET_SNAPSHOT":
      sendResponse({ ok: true, data: { sessions: manager.getSnapshot() } });
      return true;
  }
});

function respondToCommand(
  task: Promise<unknown>,
  commandType: string,
  sendResponse: (value: unknown) => void
): true {
  void task.then(sendResponse).catch((error) => {
    captureExceptionSafe(error, "offscreen", { commandType });
    sendResponse(fail(message("errorExtensionActionFailed")));
  });

  return true;
}
