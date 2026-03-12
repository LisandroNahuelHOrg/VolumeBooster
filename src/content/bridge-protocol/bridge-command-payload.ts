import type { AutoBoosterConfigPayload } from "../../shared/types";

export type BridgeCommandPayload =
  | {
      type: "configure";
      payload: AutoBoosterConfigPayload;
    }
  | {
      type: "disable";
      payload: { tabId: number };
    };
