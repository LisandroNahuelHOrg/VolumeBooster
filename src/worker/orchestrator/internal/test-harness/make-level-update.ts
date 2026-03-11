import type { AutoSessionLevelPayload } from "../../../../shared/types";

export function makeLevelUpdate(
  overrides: Partial<AutoSessionLevelPayload> = {}
): AutoSessionLevelPayload {
  return {
    tabId: 7,
    level: 0.45,
    warning: "high",
    protectorActionDb: 7.5,
    clipEvents: 2,
    clipPeak: 1.1,
    protectionBypassed: false,
    outputPeak: 0.78,
    ...overrides
  };
}
