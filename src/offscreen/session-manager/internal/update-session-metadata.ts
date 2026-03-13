import type { OffscreenMetadataPayload } from "../../../shared/types";
import { applySessionAdvancedAudioSettings } from "./apply-session-advanced-audio-settings";
import { applySessionGain } from "./apply-session-gain";
import type { SessionEntry } from "./session-manager-contract";

export const updateSessionMetadata = (
  entry: SessionEntry,
  payload: OffscreenMetadataPayload,
  now: () => number
): void => {
  entry.state.title = payload.title;
  entry.state.url = payload.url;
  entry.state.domain = payload.domain;
  entry.state.favIconUrl = payload.favIconUrl;

  if (payload.gainPercent !== undefined && payload.gainPercent !== entry.state.gainPercent) {
    applySessionGain(entry, payload.gainPercent);
  }

  if (payload.advancedAudioSettings) {
    applySessionAdvancedAudioSettings(entry, payload.advancedAudioSettings);
  }

  entry.state.updatedAt = now();
};
