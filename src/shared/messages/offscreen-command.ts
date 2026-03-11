import type {
  AdvancedAudioSettings,
  OffscreenMetadataPayload,
  OffscreenSessionStartPayload
} from "../types";

/** Commands sent from the worker to the offscreen document. */
export type OffscreenCommand =
  | { type: "OFFSCREEN_START_SESSION"; payload: OffscreenSessionStartPayload }
  | { type: "OFFSCREEN_SET_GAIN"; payload: { tabId: number; gainPercent: number } }
  | { type: "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS"; payload: AdvancedAudioSettings }
  | { type: "OFFSCREEN_STOP_SESSION"; payload: { tabId: number } }
  | { type: "OFFSCREEN_STOP_ALL" }
  | { type: "OFFSCREEN_GET_SNAPSHOT" }
  | { type: "OFFSCREEN_UPDATE_METADATA"; payload: OffscreenMetadataPayload };
