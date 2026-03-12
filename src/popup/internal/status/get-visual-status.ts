import type { CaptureSessionState } from "../../../shared/types";

export function getVisualStatus(
  session: CaptureSessionState | null | undefined,
  tabSupported: boolean
): string {
  if (!tabSupported) {
    return "unsupported";
  }

  if (!session) {
    return "inactive";
  }

  if (session.engineStatus === "loading") {
    return "pending";
  }

  if (session.engineStatus === "error") {
    return "error";
  }

  return session.streamState;
}
