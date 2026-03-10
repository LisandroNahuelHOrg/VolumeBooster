import { getDomainFromUrl } from "../../shared/domain";
import type { AutoSessionAttachFailedPayload } from "../../shared/types";
import { getI18nMessageSafe } from "../runtime-api";
import { getPageFaviconUrl } from "./get-page-favicon-url";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function reportAttachFailure(
  controller: AutoBoosterControllerInternals
): void {
  if (controller.state.tabId === null) {
    return;
  }

  const payload: AutoSessionAttachFailedPayload = {
    tabId: controller.state.tabId,
    title: document.title || getI18nMessageSafe("tabUntitled"),
    url: window.location.href,
    domain: getDomainFromUrl(window.location.href),
    favIconUrl: getPageFaviconUrl(),
    isTopFrame: controller.frameContext.isTopFrame,
    frameUrl: controller.frameContext.frameUrl,
    autoAttachState: "failed",
    autoAttachReason: controller.state.attachReason,
    autoBoosterScope: controller.state.scope ?? undefined,
    autoActiveStrategy: controller.state.activeStrategy,
    gainPercent: controller.state.gainPercent,
    engineLane: "auto_media_element",
    engineStatus: "error",
    streamState: "error",
    lastError: controller.state.lastError
  };

  void controller.postRuntimeMessage({
    type: "AUTO_SESSION_ATTACH_FAILED",
    payload
  });
}
