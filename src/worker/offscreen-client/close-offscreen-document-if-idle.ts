import { hasOffscreenDocument } from "./has-offscreen-document";

export async function closeOffscreenDocumentIfIdle(sessionCount: number): Promise<void> {
  if (sessionCount > 0 || !(await hasOffscreenDocument())) {
    return;
  }

  await chrome.offscreen.closeDocument();
}
