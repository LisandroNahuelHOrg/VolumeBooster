import { deriveClippingSafetyMarginDb } from "../../../shared/audio-settings";

export function getClippingSafetyAlert(outputPeak: number, clipEvents: number): "danger" | "none" {
  const marginDb = deriveClippingSafetyMarginDb(outputPeak);

  if (clipEvents > 0) {
    return "danger";
  }

  if (marginDb !== null && marginDb < 0.8) {
    return "danger";
  }

  return "none";
}
