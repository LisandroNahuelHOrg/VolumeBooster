import type {
  AutoAttachReason,
  AutoAttachState,
  AutoBoosterConfigPayload
} from "../../shared/types";
import type { BridgeActiveStrategy } from "./bridge-active-strategy";

export interface BridgeStatusPayload {
  enabled: boolean;
  suspended: boolean;
  scope: AutoBoosterConfigPayload["scope"] | null;
  attachState: AutoAttachState;
  attachReason?: AutoAttachReason;
  activeStrategy: BridgeActiveStrategy;
  audioContextState: AudioContextState | "none";
  autoplayPolicy?: string;
  audioContextCount: number;
  attachedNodeCount: number;
  lastTechnicalError?: string;
  currentUrl: string;
}
