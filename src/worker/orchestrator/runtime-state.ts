import type { SettingsRepository } from "../../shared/storage";
import type {
  AutoBoosterDebugState,
  AutoBoosterMode,
  AutoBoosterScope,
  AutoBoosterTabState,
  CaptureSessionState,
  LocalizedMessage
} from "../../shared/types";
import type { AutoBoosterClient } from "../auto-booster-client";
import type { AutoFrameRegistry } from "../auto-frame-registry";
import type { OffscreenClient } from "../offscreen-client";

export interface AutoTabRuntimeState extends AutoBoosterTabState {
  gainPercent: number;
  lastError?: LocalizedMessage;
}

export type AutoDebugStateSnapshot = Pick<
  AutoBoosterDebugState,
  "frameCount" | "readyFrameCount" | "attachedFrameCount" | "toastVisible"
>;

export interface WorkerRuntimeState {
  offscreenClient: OffscreenClient;
  settingsRepository: SettingsRepository;
  now: () => number;
  autoBoosterClient: AutoBoosterClient;
  sessions: Map<number, CaptureSessionState>;
  manualSessions: Map<number, CaptureSessionState>;
  autoSessions: Map<number, CaptureSessionState>;
  autoTabStates: Map<number, AutoTabRuntimeState>;
  autoDebugStates: Map<number, AutoDebugStateSnapshot>;
  autoFrameRegistry: AutoFrameRegistry;
  siteEnabledAutoTabs: Set<number>;
  autoSuppressedTabs: Set<number>;
  badgedTabs: Set<number>;
  audibleTabs: Map<number, number>;
  badgePulseTimer: ReturnType<typeof globalThis.setInterval> | null;
  badgePulseHighlighted: boolean;
  autoBoosterMode: AutoBoosterMode;
}

export interface WorkerRuntimeDeps {
  offscreenClient?: OffscreenClient;
  settingsRepository?: SettingsRepository;
  now?: () => number;
  autoBoosterClient?: AutoBoosterClient;
}

export type AutoScopeMap = Map<number, AutoBoosterScope>;
