export function hasManualSession(state, tabId) {
  if (!state?.sessions) {
    return false;
  }

  for (const session of state.sessions) {
    if (session?.tabId !== tabId) {
      continue;
    }

    if (session.engineLane !== "manual_tab_capture") {
      continue;
    }

    if (session.streamState === "pending" || session.streamState === "active") {
      return true;
    }
  }

  return false;
}
