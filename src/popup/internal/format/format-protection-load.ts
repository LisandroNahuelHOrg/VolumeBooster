import { deriveProtectionLoadPercent } from "../../../shared/audio-settings";
import type { CaptureSessionState } from "../../../shared/types";

export function formatProtectionLoad(session: CaptureSessionState | null | undefined): string {
  if (!session) {
    return "0%";
  }

  const load = deriveProtectionLoadPercent({
    protectionBypassed: session.protectionBypassed,
    protectorActionDb: session.protectorActionDb,
    inputPeak: session.level,
    outputPeak: session.outputPeak
  });

  return `${load}%`;
}
