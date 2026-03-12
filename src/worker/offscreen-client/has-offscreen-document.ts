import { getOffscreenContexts } from "./get-offscreen-contexts";

export async function hasOffscreenDocument(): Promise<boolean> {
  const existingContexts = await getOffscreenContexts();
  return existingContexts.length > 0;
}
