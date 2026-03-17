import { DEFAULT_PREMIUM_ENTITLEMENT_STATE } from "../../shared/premium-license";
import { PremiumTrialRepository } from "../../shared/premium-trial";
import { SessionBoostRepository } from "../../shared/session-boost";
import { SettingsRepository } from "../../shared/storage";
import { createAutoBoosterClient } from "../auto-booster-client";
import { AutoFrameRegistry } from "../auto-frame-registry";
import { createOffscreenClient } from "../offscreen-client";
import type { WorkerRuntimeDeps, WorkerRuntimeState } from "./runtime-state";

export function createWorkerRuntime(deps: WorkerRuntimeDeps = {}): WorkerRuntimeState {
  return {
    offscreenClient: deps.offscreenClient ?? createOffscreenClient(),
    settingsRepository: deps.settingsRepository ?? new SettingsRepository(),
    premiumTrialRepository: deps.premiumTrialRepository ?? new PremiumTrialRepository(),
    sessionBoostRepository: deps.sessionBoostRepository ?? new SessionBoostRepository(),
    now: deps.now ?? (() => Date.now()),
    autoBoosterClient: deps.autoBoosterClient ?? createAutoBoosterClient(),
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
    autoBoosterMode: "off",
    premiumTrialRecord: null,
    premiumEntitlement: DEFAULT_PREMIUM_ENTITLEMENT_STATE
  };
}
