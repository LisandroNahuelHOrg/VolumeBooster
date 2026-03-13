import { isProtectionBypassedSettings } from "../../../shared/audio-settings";
import type { AdvancedAudioSettings } from "../../../shared/types";
import type { SessionEntry } from "./session-manager-contract";

export const applySessionAdvancedAudioSettings = (
  entry: SessionEntry,
  settings: AdvancedAudioSettings
): void => {
  entry.audioSession.setAdvancedAudioSettings(settings);
  entry.state.protectorActionDb = 0;
  entry.state.clipEvents = 0;
  entry.state.clipPeak = 0;
  entry.state.protectionBypassed = isProtectionBypassedSettings(settings);
  entry.state.outputPeak = 0;
  entry.state.warning = "none";
};
