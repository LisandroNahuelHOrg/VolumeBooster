import type { SessionMap } from "./session-manager-contract";

export const discardSessionEntry = async (
  sessions: SessionMap,
  tabId: number
): Promise<void> => {
  const entry = sessions.get(tabId);

  if (!entry) {
    return;
  }

  await entry.audioSession.stop().catch(() => undefined);
  sessions.delete(tabId);
};
