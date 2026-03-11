import type { SettingsRepository } from "../../shared/storage";
import type {
  AutoBoosterMode,
  AutoBoosterScope,
  CaptureSessionState,
} from "../../shared/types";
import type {
  AggregatedAutoTabState as WorkerAggregatedAutoTabState,
  AutoDebugStateSnapshot as WorkerAutoDebugStateSnapshot
} from "../auto-tab-aggregate";
import type { AutoBoosterClient } from "../auto-booster-client";
import type { AutoFrameRegistry } from "../auto-frame-registry";
import type { OffscreenClient } from "../offscreen-client";

export type AutoTabRuntimeState = WorkerAggregatedAutoTabState;

export type AutoDebugStateSnapshot = WorkerAutoDebugStateSnapshot;

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
