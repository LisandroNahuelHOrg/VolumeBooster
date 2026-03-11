import { OFFSCREEN_DOCUMENT_PATH, OFFSCREEN_JUSTIFICATION } from "../../shared/constants";
import { getOffscreenContexts } from "./get-offscreen-contexts";

export async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await getOffscreenContexts();

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: OFFSCREEN_JUSTIFICATION
  });
}
