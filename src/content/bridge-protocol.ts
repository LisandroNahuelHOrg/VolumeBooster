/**
 * @fileoverview Contrato de mensajería y payloads del bridge experimental de
 * Web Audio en MAIN world.
 */
import type { AdvancedAudioSettings, AutoAttachReason, AutoAttachState, AutoBoosterConfigPayload, LevelWarning } from "../shared/types";

export const BRIDGE_SOURCE = "prism-auto-booster-bridge";
export const BRIDGE_COMMAND_EVENT = "prism:auto-booster:command";
export const BRIDGE_STATUS_EVENT = "prism:auto-booster:status";
export const BRIDGE_TELEMETRY_EVENT = "prism:auto-booster:telemetry";

/**
 * Estrategia activa reportada por el bridge del MAIN world.
 */
export type BridgeActiveStrategy = "none" | "web_audio_bridge";
export type BridgeRecoveryReason = "late_boot_missed" | "hot_attach_failed";

/**
 * Métricas resumidas que el bridge envía al controlador aislado.
 */
export interface BridgeRuntimeMetrics {
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  outputPeak: number;
}

/**
 * Estado operacional reportado por el bridge para una pestaña.
 */
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

/**
 * Telemetría en tiempo real producida por el bridge del MAIN world.
 */
export interface BridgeTelemetryPayload {
  activeStrategy: BridgeActiveStrategy;
  level: number;
  warning: LevelWarning;
  metrics: BridgeRuntimeMetrics;
  audioContextCount: number;
  attachedNodeCount: number;
  lastTelemetryAt: number;
}

/**
 * Comandos emitidos desde el content script aislado hacia el bridge del MAIN
 * world.
 */
export type BridgeCommandPayload =
  | {
      type: "configure";
      payload: AutoBoosterConfigPayload;
    }
  | {
      type: "disable";
      payload: { tabId: number };
    };

/**
 * Envoltorio estándar para transportar eventos del bridge con un source fijo.
 */
export interface BridgeCustomEventDetail<T> {
  source: typeof BRIDGE_SOURCE;
  payload: T;
}

/**
 * Crea el evento DOM usado para configurar o desactivar el bridge.
 */
export function createBridgeCommandEvent(payload: BridgeCommandPayload): CustomEvent<BridgeCustomEventDetail<BridgeCommandPayload>> {
  return new CustomEvent(BRIDGE_COMMAND_EVENT, {
    detail: {
      source: BRIDGE_SOURCE,
      payload
    }
  });
}

/**
 * Crea el evento DOM usado para publicar cambios de estado del bridge.
 */
export function createBridgeStatusEvent(payload: BridgeStatusPayload): CustomEvent<BridgeCustomEventDetail<BridgeStatusPayload>> {
  return new CustomEvent(BRIDGE_STATUS_EVENT, {
    detail: {
      source: BRIDGE_SOURCE,
      payload
    }
  });
}

/**
 * Crea el evento DOM usado para publicar telemetría del bridge.
 */
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

/**
 * Verifica que un detail de evento corresponda al protocolo del bridge.
 */
export function isBridgeEventDetail<T>(detail: unknown): detail is BridgeCustomEventDetail<T> {
  return Boolean(
    detail &&
      typeof detail === "object" &&
      "source" in detail &&
      (detail as { source?: unknown }).source === BRIDGE_SOURCE &&
      "payload" in detail
  );
}

/**
 * Devuelve un objeto base de métricas para inicializar o resetear el bridge.
 */
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
