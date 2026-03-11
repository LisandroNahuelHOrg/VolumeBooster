/**
 * @fileoverview Shared types for the automation bridge contract.
 * @module automation/automation-bridge-types
 */

import type { PopupCommand } from "../shared/messages";
import type {
  AutoBoosterDebugState,
  RuntimeResponse,
  WorkerState
} from "../shared/types";

/** Minimal tab payload returned by the automation bridge helpers. */
export interface AutomationTabSummary {
  id: number;
  url?: string;
  title?: string;
}

/** Automation bridge consumed by Playwright and smoke-testing tooling. */
export interface PrismAutomationBridge {
  requestGlobalPermission(): Promise<WorkerState | null>;
  hasGlobalPermission(): Promise<boolean>;
  sendCommand<T = unknown>(command: PopupCommand): Promise<T | null>;
  sendCommandDetailed<T = unknown>(command: PopupCommand): Promise<RuntimeResponse<T>>;
  getState(): Promise<WorkerState | null>;
  getStateDetailed(): Promise<RuntimeResponse<WorkerState>>;
  getDebugState(tabId: number): Promise<AutoBoosterDebugState | null>;
  getDebugStateDetailed(tabId: number): Promise<RuntimeResponse<AutoBoosterDebugState | null>>;
  getActiveTab(): Promise<AutomationTabSummary | null>;
  getTabsByUrl(urlPattern: string): Promise<AutomationTabSummary[]>;
}

declare global {
  interface Window {
    __PRISM_AUTOMATION__?: PrismAutomationBridge;
  }
}
