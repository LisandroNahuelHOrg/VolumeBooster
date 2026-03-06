import type { I18nKey, I18nSubstitutionsFor } from "../generated/i18n-types";

export type SessionStreamState = "inactive" | "pending" | "active" | "error";
export type LevelWarning = "none" | "high" | "danger";
export type AudioQualityProtectorMode =
  | "off"
  | "balanced"
  | "bass_aware"
  | "clarity"
  | "maximum_protection";
export type QualityPreset = "balanced" | "maximum_clarity" | "maximum_loudness" | "bass_boost" | "custom";
export type AudioEngineStatus = "loading" | "ready" | "error";
export type AutoBoosterMode = "off" | "global";
export type AutoAttachState =
  | "idle"
  | "observing"
  | "awaiting_user_gesture"
  | "attached"
  | "failed"
  | "unsupported";
export type AutoAttachReason =
  | "no_media"
  | "attach_failed"
  | "site_not_hookable"
  | "permission_missing"
  | "autoplay_blocked"
  | "source_conflict";
export type EngineLane = "manual_tab_capture" | "auto_media_element";
export type AutoBoosterScope = "site" | "global";

export interface AdvancedAudioSettings {
  qualityPreset: QualityPreset;
  qualityProtectorMode: AudioQualityProtectorMode;
  ceilingDb: number;
  lookaheadMs: number;
  releaseMs: number;
  multibandDepth: number;
  softClipMix: number;
}

export interface GlobalAudioSettings {
  global: AdvancedAudioSettings;
}

export interface DspRuntimeMetrics {
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  inputPeak: number;
  outputPeak: number;
}

export interface LocalizedMessage<K extends I18nKey = I18nKey> {
  key: K;
  substitutions?: Record<string, string | number>;
}

export interface CaptureSessionState {
  tabId: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
  gainPercent: number;
  engineLane: EngineLane;
  autoBoosterScope?: AutoBoosterScope;
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
  autoAttachState: AutoAttachState;
  autoAttachReason?: AutoAttachReason;
}

export interface WorkerState {
  currentTab: TabSummary | null;
  advancedAudioSettings: AdvancedAudioSettings;
  autoBoosterMode: AutoBoosterMode;
  globalAutoGainPercent: number;
  sessions: CaptureSessionState[];
  generatedAt: number;
}

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

export interface ExtensionSettings {
  domainGains: Record<string, number>;
  audioSettings: GlobalAudioSettings;
  autoBoosterMode: AutoBoosterMode;
  globalAutoGainPercent: number;
}

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

export interface OffscreenMetadataPayload {
  tabId: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
  gainPercent?: number;
  advancedAudioSettings?: AdvancedAudioSettings;
}

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

export interface SessionStatusPayload {
  tabId: number;
  streamState: SessionStreamState;
  engineStatus: AudioEngineStatus;
  gainPercent: number;
  lastError?: LocalizedMessage;
}

export interface AutoBoosterTabState {
  tabId: number;
  title: string;
  url?: string;
  domain?: string;
  favIconUrl?: string;
  autoAttachState: AutoAttachState;
  autoAttachReason?: AutoAttachReason;
  autoBoosterScope?: AutoBoosterScope;
}

export interface AutoBoosterConfigPayload {
  tabId: number;
  scope: AutoBoosterScope;
  enabled: boolean;
  suspended: boolean;
  gainPercent: number;
  advancedAudioSettings: AdvancedAudioSettings;
}

export interface AutoSessionStatusPayload extends AutoBoosterTabState {
  gainPercent: number;
  streamState: SessionStreamState;
  engineStatus: AudioEngineStatus;
  engineLane: "auto_media_element";
  lastError?: LocalizedMessage;
}

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

export interface AutoSessionAttachFailedPayload extends AutoBoosterTabState {
  gainPercent: number;
  engineLane: "auto_media_element";
  engineStatus: AudioEngineStatus;
  streamState: SessionStreamState;
  lastError?: LocalizedMessage;
}

export interface AutoSessionToastRequestedPayload {
  tabId: number;
  reason: AutoAttachReason;
}

export interface AutoBoosterDebugState {
  tabId: number | null;
  lane: EngineLane;
  enabled: boolean;
  suspended: boolean;
  scope: AutoBoosterScope | null;
  attachState: AutoAttachState;
  attachReason?: AutoAttachReason;
  audioContextState: AudioContextState | "none";
  autoplayPolicy?: string;
  mediaElementCount: number;
  attachedElementCount: number;
  lastTelemetryAt: number | null;
  lastLevel: number;
  lastError?: LocalizedMessage;
  lastTechnicalError?: string;
  currentUrl?: string;
}

export interface RuntimeResponse<T = void> {
  ok: boolean;
  data?: T;
  errorMessage?: LocalizedMessage;
}
