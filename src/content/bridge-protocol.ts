import type { AdvancedAudioSettings, AutoAttachReason, AutoAttachState, AutoBoosterConfigPayload, LevelWarning } from "../shared/types";

export const BRIDGE_SOURCE = "prism-auto-booster-bridge";
export const BRIDGE_COMMAND_EVENT = "prism:auto-booster:command";
export const BRIDGE_STATUS_EVENT = "prism:auto-booster:status";
export const BRIDGE_TELEMETRY_EVENT = "prism:auto-booster:telemetry";

export type BridgeActiveStrategy = "none" | "web_audio_bridge";
export type BridgeRecoveryReason = "late_boot_missed" | "hot_attach_failed";

export interface BridgeRuntimeMetrics {
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  outputPeak: number;
}

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
  recoveryPending?: boolean;
  recoveryUsed?: boolean;
  recoveryReason?: BridgeRecoveryReason;
  currentUrl: string;
}

export interface BridgeTelemetryPayload {
  activeStrategy: BridgeActiveStrategy;
  level: number;
  warning: LevelWarning;
  metrics: BridgeRuntimeMetrics;
  audioContextCount: number;
  attachedNodeCount: number;
  lastTelemetryAt: number;
}

export type BridgeCommandPayload =
  | {
      type: "configure";
      payload: AutoBoosterConfigPayload;
    }
  | {
      type: "disable";
      payload: { tabId: number };
    };

export interface BridgeCustomEventDetail<T> {
  source: typeof BRIDGE_SOURCE;
  payload: T;
}

export function createBridgeCommandEvent(payload: BridgeCommandPayload): CustomEvent<BridgeCustomEventDetail<BridgeCommandPayload>> {
  return new CustomEvent(BRIDGE_COMMAND_EVENT, {
    detail: {
      source: BRIDGE_SOURCE,
      payload
    }
  });
}

export function createBridgeStatusEvent(payload: BridgeStatusPayload): CustomEvent<BridgeCustomEventDetail<BridgeStatusPayload>> {
  return new CustomEvent(BRIDGE_STATUS_EVENT, {
    detail: {
      source: BRIDGE_SOURCE,
      payload
    }
  });
}

export function createBridgeTelemetryEvent(
  payload: BridgeTelemetryPayload
): CustomEvent<BridgeCustomEventDetail<BridgeTelemetryPayload>> {
  return new CustomEvent(BRIDGE_TELEMETRY_EVENT, {
    detail: {
      source: BRIDGE_SOURCE,
      payload
    }
  });
}

export function isBridgeEventDetail<T>(detail: unknown): detail is BridgeCustomEventDetail<T> {
  return Boolean(
    detail &&
      typeof detail === "object" &&
      "source" in detail &&
      (detail as { source?: unknown }).source === BRIDGE_SOURCE &&
      "payload" in detail
  );
}

export function createBridgeDefaultMetrics(
  protectionBypassed = false
): BridgeRuntimeMetrics {
  return {
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed,
    outputPeak: 0
  };
}
