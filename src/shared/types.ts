/**
 * @fileoverview Shared domain types exchanged between popup, worker, content,
 * and offscreen contexts.
 * @module shared/types
 */

import type { I18nKey, I18nSubstitutionsFor } from "../generated/i18n-types";

/** Lifecycle state of a session stream from the user-facing perspective. */
export type SessionStreamState = "inactive" | "pending" | "active" | "error";
/** Coarse warning severity used across live audio telemetry UI. */
export type LevelWarning = "none" | "high" | "danger";
/** Global audio quality-protector modes exposed to users. */
export type AudioQualityProtectorMode =
  | "off"
  | "balanced"
  | "bass_aware"
  | "clarity"
  | "maximum_protection";
/** Advanced sound-shaping presets exposed in the popup. */
export type QualityPreset = "balanced" | "maximum_clarity" | "maximum_loudness" | "bass_boost" | "custom";
/** Engine readiness state for manual and automatic audio lanes. */
export type AudioEngineStatus = "loading" | "ready" | "error";
/** Persisted automatic booster mode. */
export type AutoBoosterMode = "off" | "global";
/** Current attachment state of the automatic booster lane for a tab. */
export type AutoAttachState =
  | "idle"
  | "observing"
  | "awaiting_user_gesture"
  | "attached"
  | "failed"
  | "unsupported";
/** Reason associated with an automatic booster attach state. */
export type AutoAttachReason =
  | "no_media"
  | "attach_failed"
  | "site_not_hookable"
  | "permission_missing"
  | "autoplay_blocked"
  | "source_conflict";
/** Runtime lane currently processing tab audio. */
export type EngineLane = "manual_tab_capture" | "auto_media_element";
/** Scope of an automatic booster session. */
export type AutoBoosterScope = "site" | "global";
/** Effective automatic strategy currently attached on the page. */
export type AutoActiveStrategy = "none" | "media_element" | "web_audio_bridge" | "hybrid";
/** Reason associated with a one-shot automatic recovery attempt. */
export type AutoRecoveryReason = "late_boot_missed" | "hot_attach_failed";

/** Persisted advanced DSP settings controlled from the popup. */
export interface AdvancedAudioSettings {
  qualityPreset: QualityPreset;
  qualityProtectorMode: AudioQualityProtectorMode;
  ceilingDb: number;
  lookaheadMs: number;
  releaseMs: number;
  multibandDepth: number;
  softClipMix: number;
}

/** Root persisted audio-settings object. */
export interface GlobalAudioSettings {
  global: AdvancedAudioSettings;
}

/** Runtime DSP metrics surfaced to the popup. */
export interface DspRuntimeMetrics {
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  inputPeak: number;
  outputPeak: number;
}

/** Structured i18n message descriptor sent over runtime messaging instead of plain strings. */
export interface LocalizedMessage<K extends I18nKey = I18nKey> {
  key: K;
  substitutions?: Record<string, string | number>;
}

/** Full state of an active capture or automatic booster session for a tab. */
export interface CaptureSessionState {
  tabId: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
  gainPercent: number;
  engineLane: EngineLane;
  autoBoosterScope?: AutoBoosterScope;
  autoActiveStrategy?: AutoActiveStrategy;
  autoAttachState: AutoAttachState;
  autoAttachReason?: AutoAttachReason;
  recoveryPending?: boolean;
  recoveryUsed?: boolean;
  recoveryReason?: AutoRecoveryReason;
  streamState: SessionStreamState;
  engineStatus: AudioEngineStatus;
  level: number;
  warning: LevelWarning;
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  outputPeak: number;
  lastError?: LocalizedMessage;
  updatedAt: number;
}

/** Reduced summary of the current tab used by the popup. */
export interface TabSummary {
  tabId: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
  supported: boolean;
  preferredGainPercent: number;
  hasStoredPreference: boolean;
  activeLane?: EngineLane;
  autoBoosterScope?: AutoBoosterScope;
  autoActiveStrategy?: AutoActiveStrategy;
  autoAttachState: AutoAttachState;
  autoAttachReason?: AutoAttachReason;
  recoveryPending?: boolean;
  recoveryUsed?: boolean;
  recoveryReason?: AutoRecoveryReason;
}

/** Worker-owned snapshot sent to the popup on each state refresh. */
export interface WorkerState {
  currentTab: TabSummary | null;
  advancedAudioSettings: AdvancedAudioSettings;
  autoBoosterMode: AutoBoosterMode;
  globalAutoGainPercent: number;
  sessions: CaptureSessionState[];
  generatedAt: number;
}

/** Popup-specific projection of the worker state. */
export interface PopupViewModel {
  currentTab: TabSummary | null;
  currentSession: CaptureSessionState | null;
  currentManualSession: CaptureSessionState | null;
  currentAutoSession: CaptureSessionState | null;
  activeSessions: CaptureSessionState[];
  advancedAudioSettings: AdvancedAudioSettings;
  autoBoosterMode: AutoBoosterMode;
  globalAutoGainPercent: number;
  gainPercent: number;
  sessionCount: number;
  canStart: boolean;
}

/** Persisted extension settings stored in Chrome local storage. */
export interface ExtensionSettings {
  domainGains: Record<string, number>;
  audioSettings: GlobalAudioSettings;
  autoBoosterMode: AutoBoosterMode;
  globalAutoGainPercent: number;
}

/** Payload required to bootstrap an offscreen manual capture session. */
export interface OffscreenSessionStartPayload {
  tabId: number;
  streamId: string;
  gainPercent: number;
  advancedAudioSettings: AdvancedAudioSettings;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
}

/** Mutable metadata fields that can be refreshed for an offscreen session. */
export interface OffscreenMetadataPayload {
  tabId: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
  gainPercent?: number;
  advancedAudioSettings?: AdvancedAudioSettings;
}

/** Live level and protection metrics emitted by the offscreen/manual lane. */
export interface LevelUpdatePayload {
  tabId: number;
  level: number;
  warning: LevelWarning;
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  outputPeak: number;
}

/** Session lifecycle update emitted by the offscreen/manual lane. */
export interface SessionStatusPayload {
  tabId: number;
  streamState: SessionStreamState;
  engineStatus: AudioEngineStatus;
  gainPercent: number;
  lastError?: LocalizedMessage;
}

/** Automatic booster tab state tracked independently from manual capture. */
export interface AutoBoosterTabState {
  tabId: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
  autoAttachState: AutoAttachState;
  autoAttachReason?: AutoAttachReason;
  autoBoosterScope?: AutoBoosterScope;
  autoActiveStrategy?: AutoActiveStrategy;
  recoveryPending?: boolean;
  recoveryUsed?: boolean;
  recoveryReason?: AutoRecoveryReason;
}

/** Configuration pushed from the worker to the automatic booster content script. */
export interface AutoBoosterConfigPayload {
  tabId: number;
  scope: AutoBoosterScope;
  enabled: boolean;
  suspended: boolean;
  gainPercent: number;
  advancedAudioSettings: AdvancedAudioSettings;
}

/** Automatic session status update emitted by the content script. */
export interface AutoSessionStatusPayload extends AutoBoosterTabState {
  gainPercent: number;
  streamState: SessionStreamState;
  engineStatus: AudioEngineStatus;
  engineLane: "auto_media_element";
  lastError?: LocalizedMessage;
  bridgeContextCount?: number;
  bridgeAttachedNodeCount?: number;
}

/** Live audio level update emitted by the automatic content lane. */
export interface AutoSessionLevelPayload {
  tabId: number;
  level: number;
  warning: LevelWarning;
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  outputPeak: number;
}

/** Automatic attach failure payload emitted by the content script. */
export interface AutoSessionAttachFailedPayload extends AutoBoosterTabState {
  gainPercent: number;
  engineLane: "auto_media_element";
  engineStatus: AudioEngineStatus;
  streamState: SessionStreamState;
  lastError?: LocalizedMessage;
  bridgeContextCount?: number;
  bridgeAttachedNodeCount?: number;
}

/** Request to show an in-page failure toast for the automatic lane. */
export interface AutoSessionToastRequestedPayload {
  tabId: number;
  reason: AutoAttachReason;
}

/** Rich diagnostic snapshot used by debugging tools and automated tests. */
export interface AutoBoosterDebugState {
  tabId: number | null;
  lane: EngineLane;
  enabled: boolean;
  suspended: boolean;
  scope: AutoBoosterScope | null;
  attachState: AutoAttachState;
  attachReason?: AutoAttachReason;
  activeStrategy?: AutoActiveStrategy;
  audioContextState: AudioContextState | "none";
  autoplayPolicy?: string;
  mediaElementCount: number;
  attachedElementCount: number;
  bridgeContextCount?: number;
  bridgeAttachedNodeCount?: number;
  recoveryPending?: boolean;
  recoveryUsed?: boolean;
  recoveryReason?: AutoRecoveryReason;
  lastTelemetryAt: number | null;
  lastLevel: number;
  lastError?: LocalizedMessage;
  lastTechnicalError?: string;
  currentUrl?: string;
}

/** Standard runtime response envelope shared by all extension contexts. */
export interface RuntimeResponse<T = void> {
  ok: boolean;
  data?: T;
  errorMessage?: LocalizedMessage;
}
