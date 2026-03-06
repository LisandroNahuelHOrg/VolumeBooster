import { isContentCommand } from "../shared/messages";
import { AutoBoosterController } from "./controller";

declare global {
  interface Window {
    __PRISM_AUTO_BOOSTER_CONTROLLER__?: AutoBoosterController;
    __PRISM_AUTO_BOOSTER_BOOTED__?: boolean;
  }
}

if (!window.__PRISM_AUTO_BOOSTER_BOOTED__) {
  const controller = new AutoBoosterController();
  window.__PRISM_AUTO_BOOSTER_CONTROLLER__ = controller;
  window.__PRISM_AUTO_BOOSTER_BOOTED__ = true;

  chrome.runtime.onMessage.addListener((incomingMessage, _sender, sendResponse) => {
    if (!isContentCommand(incomingMessage)) {
      return false;
    }

    void (async () => {
      try {
        if (incomingMessage.type === "AUTO_BOOSTER_PING") {
          sendResponse({ ready: true });
          return;
        }

        if (incomingMessage.type === "AUTO_BOOSTER_CONFIGURE") {
          await controller.configure(incomingMessage.payload);
          sendResponse(undefined);
          return;
        }

        if (incomingMessage.type === "AUTO_BOOSTER_DISABLE") {
          await controller.disable(incomingMessage.payload.tabId);
          sendResponse(undefined);
          return;
        }

        if (incomingMessage.type === "AUTO_BOOSTER_GET_DEBUG_STATE") {
          sendResponse(controller.getDebugState());
        }
      } catch {
        sendResponse(undefined);
      }
    })();

    return true;
  });

  window.addEventListener("beforeunload", () => {
    void controller.destroy();
  });
}
