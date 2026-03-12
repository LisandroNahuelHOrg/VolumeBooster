import { OFFSCREEN_DOCUMENT_PATH } from "../../shared/constants";

export function getOffscreenContexts(): Promise<chrome.runtime.ExtensionContext[]> {
  return chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });
}
