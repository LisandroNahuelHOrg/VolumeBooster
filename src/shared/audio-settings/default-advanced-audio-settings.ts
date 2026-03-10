import type { AdvancedAudioSettings } from "../types";
import { DSP_PROFILE_TABLE } from "./dsp-profile-table";

/** Default advanced audio settings applied to new installs and resets. */
export const DEFAULT_ADVANCED_AUDIO_SETTINGS: AdvancedAudioSettings = {
  qualityPreset: "balanced",
  qualityProtectorMode: "balanced",
  ceilingDb: DSP_PROFILE_TABLE.balanced.ceilingDb,
  lookaheadMs: DSP_PROFILE_TABLE.balanced.lookaheadMs,
  releaseMs: DSP_PROFILE_TABLE.balanced.releaseMs,
  multibandDepth: DSP_PROFILE_TABLE.balanced.multibandDepth,
  softClipMix: DSP_PROFILE_TABLE.balanced.softClipMix
};
