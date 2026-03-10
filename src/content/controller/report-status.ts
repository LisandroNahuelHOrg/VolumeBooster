import { getDomainFromUrl } from "../../shared/domain";
import type { AutoSessionStatusPayload } from "../../shared/types";
import { getI18nMessageSafe } from "../runtime-api";
import { getPageFaviconUrl } from "./get-page-favicon-url";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function reportStatus(controller: AutoBoosterControllerInternals): void {
  if (controller.state.tabId === null) {
    return;
  }

  const payload: AutoSessionStatusPayload = {
    tabId: controller.state.tabId,
    title: document.title || getI18nMessageSafe("tabUntitled"),
    url: window.location.href,
    domain: getDomainFromUrl(window.location.href),
    favIconUrl: getPageFaviconUrl(),
    isTopFrame: controller.frameContext.isTopFrame,
    frameUrl: controller.frameContext.frameUrl,
    autoAttachState: controller.state.attachState,
    autoAttachReason: controller.state.attachReason,
    autoBoosterScope: controller.state.scope ?? undefined,
    autoActiveStrategy: controller.state.activeStrategy,
    gainPercent: controller.state.gainPercent,
    streamState: controller.state.attachState === "attached" ? "active" : "inactive",
    engineStatus: controller.state.attachState === "failed" ? "error" : "ready",
    engineLane: "auto_media_element",
    lastError: controller.state.lastError
  };

  void controller.postRuntimeMessage({
    type: "AUTO_SESSION_STATUS_UPDATE",
    payload
  });
}
