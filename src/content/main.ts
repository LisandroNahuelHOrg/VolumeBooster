/**
 * @fileoverview Entry point del content script aislado que expone el
 * controlador automático del modo `All sites`.
 */
import { getDuckDuckGoFaviconUrl, getDomainFromUrl } from "../shared/domain";
import { isContentCommand } from "../shared/messages";
import type { AutoFallbackToastCommandPayload } from "../shared/types";
import { AutoBoosterController } from "./controller";
import { AutoFallbackToast } from "./fallback-toast";
import { getCurrentFrameContext } from "./frame-runtime";
import { addRuntimeMessageListenerSafe, getI18nMessageSafe, sendRuntimeMessageSafe } from "./runtime-api";

declare global {
  interface Window {
    /**
     * Instancia singleton del controlador automático para depuración en tiempo
     * de ejecución.
     */
    __PRISM_AUTO_BOOSTER_CONTROLLER__?: AutoBoosterController;
    __PRISM_AUTO_BOOSTER_BOOTED__?: boolean;
  }
}

if (!window.__PRISM_AUTO_BOOSTER_BOOTED__) {
  const controller = new AutoBoosterController();
  const frameContext = getCurrentFrameContext();
  const pageUrl = frameContext.frameUrl || window.location?.href || "";
  let currentToastPayload: AutoFallbackToastCommandPayload | null = null;
  const toast = new AutoFallbackToast({
    onManualFallback: () => {
      const tabId = controller.getDebugState(toast.isVisible()).tabId;

      if (tabId === null || !currentToastPayload) {
        return;
      }

      void sendRuntimeMessageSafe({
        type: "AUTO_MANUAL_FALLBACK_REQUESTED",
        payload: {
          tabId,
          reason: currentToastPayload.reason,
          isTopFrame: frameContext.isTopFrame,
          frameUrl: frameContext.frameUrl
        }
      });
    },
    onDismiss: () => {
      const tabId = controller.getDebugState(toast.isVisible()).tabId;

      if (tabId === null || !currentToastPayload) {
        return;
      }

      toast.hide();
      void sendRuntimeMessageSafe({
        type: "AUTO_FALLBACK_TOAST_DISMISSED",
        payload: {
          tabId,
          reason: currentToastPayload.reason,
          isTopFrame: frameContext.isTopFrame,
          frameUrl: frameContext.frameUrl
        }
      });
    }
  });

  window.__PRISM_AUTO_BOOSTER_CONTROLLER__ = controller;
  window.__PRISM_AUTO_BOOSTER_BOOTED__ = true;

  void sendRuntimeMessageSafe({
    type: "AUTO_BOOSTER_FRAME_READY",
    payload: {
      isTopFrame: frameContext.isTopFrame,
      frameUrl: frameContext.frameUrl,
      title: document.title || getI18nMessageSafe("tabUntitled"),
      url: pageUrl,
      domain: getDomainFromUrl(pageUrl),
      favIconUrl: getPageFaviconUrl()
    }
  });

  addRuntimeMessageListenerSafe((incomingMessage, _sender, sendResponse) => {
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
          toast.hide();
          currentToastPayload = null;
          await controller.disable(incomingMessage.payload.tabId);
          sendResponse(undefined);
          return;
        }

        if (incomingMessage.type === "AUTO_BOOSTER_SHOW_FALLBACK_TOAST") {
          currentToastPayload = incomingMessage.payload;
          toast.show(incomingMessage.payload);
          sendResponse(undefined);
          return;
        }

        if (incomingMessage.type === "AUTO_BOOSTER_HIDE_FALLBACK_TOAST") {
          currentToastPayload = null;
          toast.hide();
          sendResponse(undefined);
          return;
        }

        if (incomingMessage.type === "AUTO_BOOSTER_GET_DEBUG_STATE") {
          sendResponse(controller.getDebugState(toast.isVisible()));
        }
      } catch {
        sendResponse(undefined);
      }
    })();

    return true;
  });

  window.addEventListener("beforeunload", () => {
    toast.destroy();
    void controller.destroy();
  });
}

function getPageFaviconUrl(): string | undefined {
  const explicitFavicon =
    document.querySelector<HTMLLinkElement>('link[rel~="icon"][href]')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"][href]')?.href;

  if (explicitFavicon) {
    return explicitFavicon;
  }

  return getDuckDuckGoFaviconUrl(getDomainFromUrl(window.location?.href || ""));
}
