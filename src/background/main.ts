/**
 * @fileoverview Entry point del service worker MV3 que conecta eventos de
 * Chrome con el orquestador central de sesiones y modos de booster.
 */
import { isContentEvent, isOffscreenEvent, isPopupCommand } from "../shared/messages";
import { WorkerOrchestrator } from "../worker/orchestrator";

const orchestrator = new WorkerOrchestrator();

void orchestrator.bootstrap().catch(() => undefined);

chrome.runtime.onStartup.addListener(() => {
  void orchestrator.bootstrap().catch(() => undefined);
});

chrome.runtime.onInstalled.addListener(() => {
  void orchestrator.bootstrap().catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isPopupCommand(message)) {
    void orchestrator.handlePopupCommand(message).then(sendResponse);
    return true;
  }

  if (isOffscreenEvent(message) || isContentEvent(message)) {
    void orchestrator.handleBackgroundEvent(message).catch(() => undefined);
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void orchestrator.handleTabUpdated(tabId, changeInfo, tab).catch(() => undefined);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  void orchestrator.handleTabActivated(activeInfo).catch(() => undefined);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void orchestrator.handleTabRemoved(tabId).catch(() => undefined);
});

chrome.tabCapture.onStatusChanged.addListener((info) => {
  void orchestrator.handleCaptureStatusChanged(info).catch(() => undefined);
});
