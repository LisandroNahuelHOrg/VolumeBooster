/**
 * @fileoverview Shared domain types exchanged between popup, worker, content,
 * and offscreen contexts.
 * @module shared/types
 */

import type { I18nKey, I18nSubstitutionsFor } from "../generated/i18n-types";

/** Lifecycle state of a session stream from the user-facing perspective. */
export type SessionStreamState = "inactive" | "pending" | "active" | "error";
/** Runtime surface where an error-monitoring event originated. */
export type RuntimeContext = "popup" | "offscreen" | "automation" | "background";
/** Coarse warning severity used across live audio telemetry UI. */
export type LevelWarning = "none" | "high" | "danger";
/** Global audio quality-protector modes exposed to users. */
export type AudioQualityProtectorMode =
  | "off"
  | "balanced"
  | "warmth"
  | "bass_aware"
  | "vocal_focus"
  | "clarity"
  | "treble_safe"
  | "punch_preserve"
  | "maximum_protection";
/** Advanced sound-shaping presets exposed in the popup. */
export type QualityPreset =
  | "balanced"
  | "vocal_presence"
  | "maximum_clarity"
  | "smooth_bright"
  | "warm_cinematic"
  | "maximum_loudness"
  | "bass_boost"
  | "punch_drive"
  | "custom";
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

/** Stable identity for a frame-level automatic runtime instance. */
export interface AutoFrameIdentity {
  frameId?: number;
  documentId?: string;
  isTopFrame?: boolean;
  frameUrl?: string;
}

/** Addressable frame target used by the worker when messaging a specific document. */
export interface AutoFrameTarget {
  frameId: number;
  documentId?: string;
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
}

/** Worker-owned snapshot sent to the popup on each state refresh. */
export interface WorkerState {
  currentTab: TabSummary | null;
  advancedAudioSettings: AdvancedAudioSettings;
  autoBoosterMode: AutoBoosterMode;
  globalAutoGainPercent: number;
  hasGlobalPermission: boolean;
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
  hasGlobalPermission: boolean;
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
export interface AutoSessionStatusPayload extends AutoBoosterTabState, AutoFrameIdentity {
  gainPercent: number;
  streamState: SessionStreamState;
  engineStatus: AudioEngineStatus;
  engineLane: "auto_media_element";
  lastError?: LocalizedMessage;
  bridgeContextCount?: number;
  bridgeAttachedNodeCount?: number;
}

/** Live audio level update emitted by the automatic content lane. */
export interface AutoSessionLevelPayload extends AutoFrameIdentity {
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
export interface AutoSessionAttachFailedPayload extends AutoBoosterTabState, AutoFrameIdentity {
  gainPercent: number;
  engineLane: "auto_media_element";
  engineStatus: AudioEngineStatus;
  streamState: SessionStreamState;
  lastError?: LocalizedMessage;
  bridgeContextCount?: number;
  bridgeAttachedNodeCount?: number;
}

/** Announces that a frame runtime is alive and ready to receive configuration. */
export interface AutoBoosterFrameReadyPayload extends AutoFrameIdentity {
  tabId?: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
}

/** Sent by the top frame when the user requests switching from global to manual mode. */
export interface AutoManualFallbackRequestPayload extends AutoFrameIdentity {
  tabId: number;
  reason: AutoAttachReason;
}

/** Sent by the top frame when the persistent automatic-fallback toast is dismissed. */
export interface AutoFallbackToastDismissedPayload extends AutoFrameIdentity {
  tabId: number;
  reason: AutoAttachReason;
}

/** Command payload used by the worker to show or update the persistent fallback toast. */
export interface AutoFallbackToastCommandPayload {
  tabId: number;
  documentId?: string;
  reason: AutoAttachReason;
  errorMessage?: LocalizedMessage;
}

/** Frame-level automatic runtime state cached by the worker for aggregation. */
export interface AutoFrameRuntimeState extends AutoBoosterTabState, AutoFrameIdentity {
  frameId: number;
  isTopFrame: boolean;
  gainPercent: number;
  ready: boolean;
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
  bridgeContextCount?: number;
  bridgeAttachedNodeCount?: number;
  toastVisible?: boolean;
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
  frameCount: number;
  readyFrameCount: number;
  attachedFrameCount: number;
  toastVisible: boolean;
  bridgeContextCount?: number;
  bridgeAttachedNodeCount?: number;
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
