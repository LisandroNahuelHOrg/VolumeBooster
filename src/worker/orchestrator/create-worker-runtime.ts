import { SettingsRepository } from "../../shared/storage";
import { AutoBoosterClient } from "../auto-booster-client";
import { AutoFrameRegistry } from "../auto-frame-registry";
import { OffscreenClient } from "../offscreen-client";
import type { WorkerRuntimeDeps, WorkerRuntimeState } from "./runtime-state";

export function createWorkerRuntime(deps: WorkerRuntimeDeps = {}): WorkerRuntimeState {
  return {
    offscreenClient: deps.offscreenClient ?? new OffscreenClient(),
    settingsRepository: deps.settingsRepository ?? new SettingsRepository(),
    now: deps.now ?? (() => Date.now()),
    autoBoosterClient: deps.autoBoosterClient ?? new AutoBoosterClient(),
    sessions: new Map(),
    manualSessions: new Map(),
    autoSessions: new Map(),
    autoTabStates: new Map(),
    autoDebugStates: new Map(),
    autoFrameRegistry: new AutoFrameRegistry(),
    siteEnabledAutoTabs: new Set(),
    autoSuppressedTabs: new Set(),
    badgedTabs: new Set(),
    audibleTabs: new Map(),
    badgePulseTimer: null,
    badgePulseHighlighted: false,
    autoBoosterMode: "off"
  };
}
