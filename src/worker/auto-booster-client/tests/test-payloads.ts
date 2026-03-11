import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";

export const AUTO_CONFIG_PAYLOAD = {
  tabId: 14,
  scope: "global" as const,
  enabled: true,
  suspended: false,
  gainPercent: 230,
  advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
};

export const SITE_CONFIG_PAYLOAD = {
  tabId: 3,
  scope: "site" as const,
  enabled: true,
  suspended: false,
  gainPercent: 180,
  advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
};

export const FRAME_CONFIG_PAYLOAD = {
  tabId: 31,
  scope: "site" as const,
  enabled: true,
  suspended: false,
  gainPercent: 275,
  advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
};

export const FRAME_TARGET = {
  frameId: 3,
  documentId: "doc-3"
};
