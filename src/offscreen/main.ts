import { isOffscreenCommand } from "../shared/messages";
import { setDocumentLocaleAttributes, t } from "../shared/runtime-i18n";
import { OffscreenSessionManager } from "./session-manager";

const manager = new OffscreenSessionManager();
setDocumentLocaleAttributes(document);
document.title = t("offscreenDocumentTitle");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isOffscreenCommand(message)) {
    return false;
  }

  switch (message.type) {
    case "OFFSCREEN_START_SESSION":
      void manager.startSession(message.payload).then(sendResponse);
      return true;
    case "OFFSCREEN_SET_GAIN":
      void manager.setGain(message.payload.tabId, message.payload.gainPercent).then(sendResponse);
      return true;
    case "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS":
      void manager.setAdvancedAudioSettings(message.payload).then(sendResponse);
      return true;
    case "OFFSCREEN_STOP_SESSION":
      void manager.stopSession(message.payload.tabId).then(sendResponse);
      return true;
    case "OFFSCREEN_STOP_ALL":
      void manager.stopAll().then(sendResponse);
      return true;
    case "OFFSCREEN_UPDATE_METADATA":
      void manager.updateMetadata(message.payload).then(sendResponse);
      return true;
    case "OFFSCREEN_GET_SNAPSHOT":
      sendResponse({ ok: true, data: { sessions: manager.getSnapshot() } });
      return true;
  }
});
