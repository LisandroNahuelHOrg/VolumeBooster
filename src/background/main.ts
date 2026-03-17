/**
 * @fileoverview Entry point del service worker MV3 que conecta eventos de
 * Chrome con el orquestador central de sesiones y modos de booster.
 */
import {
  captureExceptionSafe,
  initSentryForContext,
  isSentrySmokeMirrorEnabled,
  readSentrySmokeMirrorEntries
} from "../shared/observability/sentry";
import { fail, isContentEvent, isOffscreenEvent, isPopupCommand, message as localizedMessage } from "../shared/messages";
import { WorkerOrchestrator } from "../worker/orchestrator";

initSentryForContext("background");

const orchestrator = new WorkerOrchestrator();
const sentrySmokeMirrorEnabled = isSentrySmokeMirrorEnabled(import.meta.env);

runBackgroundTask(orchestrator.bootstrap(), "bootstrap");

chrome.runtime.onStartup.addListener(() => {
  runBackgroundTask(orchestrator.bootstrap(), "startup");
});

chrome.runtime.onInstalled.addListener(() => {
  runBackgroundTask(orchestrator.bootstrap(), "install");
});

chrome.alarms.onAlarm.addListener((alarm) => {
  runBackgroundTask(orchestrator.handleAlarm(alarm), "alarm", {
    alarmName: alarm.name
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sentrySmokeMirrorEnabled && isSentrySmokeTriggerCommand(message)) {
    captureExceptionSafe(new Error(message.payload.marker), "background", {
      mechanism: "manual-smoke",
      operation: "background-smoke-trigger"
    });
    sendResponse({ ok: true });
    return false;
  }

  if (sentrySmokeMirrorEnabled && isSentrySmokeReadMirrorCommand(message)) {
    sendResponse({ ok: true, data: readSentrySmokeMirrorEntries() });
    return false;
  }

  if (isPopupCommand(message)) {
    void orchestrator
      .handlePopupCommand(message)
      .then(sendResponse)
      .catch((error) => {
        captureExceptionSafe(error, "background", {
          commandType: message.type,
          operation: "handlePopupCommand"
        });
        sendResponse(fail(localizedMessage("errorExtensionActionFailed")));
      });
    return true;
  }

  if (isOffscreenEvent(message) || isContentEvent(message)) {
    runBackgroundTask(orchestrator.handleBackgroundEvent(message, sender), "background-event", {
      eventType: message.type
    });
  }

  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  runBackgroundTask(orchestrator.handleTabUpdated(tabId, changeInfo, tab), "tab-updated", {
    status: changeInfo.status,
    tabId
  });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  runBackgroundTask(orchestrator.handleTabActivated(activeInfo), "tab-activated", {
    tabId: activeInfo.tabId
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  runBackgroundTask(orchestrator.handleTabRemoved(tabId), "tab-removed", {
    tabId
  });
});

chrome.tabCapture.onStatusChanged.addListener((info) => {
  runBackgroundTask(orchestrator.handleCaptureStatusChanged(info), "capture-status-changed", {
    status: info.status,
    tabId: info.tabId
  });
});

function runBackgroundTask(
  task: Promise<unknown>,
  operation: string,
  extras?: Record<string, unknown>
): void {
  void task.catch((error) => {
    captureExceptionSafe(error, "background", {
      operation,
      ...extras
    });
  });
}

function isSentrySmokeTriggerCommand(
  message: unknown
): message is { type: "__SENTRY_SMOKE_TRIGGER_BACKGROUND_ERROR__"; payload: { marker: string } } {
  return Boolean(
    message &&
      typeof message === "object" &&
      "type" in message &&
      (message as { type?: unknown }).type === "__SENTRY_SMOKE_TRIGGER_BACKGROUND_ERROR__" &&
      "payload" in message &&
      typeof (message as { payload?: { marker?: unknown } }).payload?.marker === "string"
  );
}

function isSentrySmokeReadMirrorCommand(message: unknown): message is { type: "__SENTRY_SMOKE_READ_TRANSPORT__" } {
  return Boolean(
    message &&
      typeof message === "object" &&
      "type" in message &&
      (message as { type?: unknown }).type === "__SENTRY_SMOKE_READ_TRANSPORT__"
  );
}
