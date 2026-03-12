import type { AdvancedAudioSettings } from "./types";

export interface BoostSettingsBundle {
  gainPercent: number;
  advancedAudioSettings: AdvancedAudioSettings;
}

export interface SessionBoostPromptState {
  hasUnsavedChanges: boolean;
  dismissed: boolean;
}

export interface SessionBoostState {
  globalDraftBundle: BoostSettingsBundle | null;
  siteSessionBundles: Record<string, BoostSettingsBundle>;
  promptDismissed: boolean;
}
