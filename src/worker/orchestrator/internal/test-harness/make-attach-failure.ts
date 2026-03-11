import type { AutoSessionAttachFailedPayload, EngineLane } from "../../../../shared/types";
import { makeAutoStatus } from "./make-auto-status";

export function makeAttachFailure(
  overrides: Omit<Partial<AutoSessionAttachFailedPayload>, "engineLane"> & { engineLane?: EngineLane } = {}
): AutoSessionAttachFailedPayload {
  const { engineLane: _ignoredEngineLane, ...statusOverrides } = overrides;
  return {
    ...makeAutoStatus({
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      ...statusOverrides
    }),
    engineLane: "auto_media_element",
    streamState: "inactive",
    engineStatus: "ready"
  };
}
