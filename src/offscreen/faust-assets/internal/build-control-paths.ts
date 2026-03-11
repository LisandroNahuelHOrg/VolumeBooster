import type { FaustDspMeta } from "@grame/faustwasm";
import type { DspControlKey } from "../faust-asset-types";
import { collectControlAddressMap } from "./collect-control-address-map";
import { requireControlPath } from "./require-control-path";

type FaustUiNode = { items?: unknown; shortname?: string; address?: string };

export function buildControlPaths(meta: FaustDspMeta): Record<DspControlKey, string> {
  const addressByShortName = collectControlAddressMap(meta.ui as FaustUiNode[]);

  return {
    inputDriveDb: requireControlPath(addressByShortName, "controls_input_drive_db", meta.name),
    lookaheadMs: requireControlPath(addressByShortName, "controls_lookahead_ms", meta.name),
    releaseMs: requireControlPath(addressByShortName, "controls_release_ms", meta.name),
    multibandDepth: requireControlPath(addressByShortName, "controls_multiband_depth", meta.name),
    protectorEnabled: requireControlPath(addressByShortName, "controls_protector_enabled", meta.name),
    outputLimiterEnabled: requireControlPath(addressByShortName, "controls_output_limiter_enabled", meta.name),
    lowBandTrimDb: requireControlPath(addressByShortName, "controls_low_band_trim_db", meta.name),
    lowBandMakeupDb: requireControlPath(addressByShortName, "controls_low_band_makeup_db", meta.name),
    lowBandThresholdOffsetDb: requireControlPath(
      addressByShortName,
      "controls_low_band_threshold_offset_db",
      meta.name
    ),
    lowBandRatioBias: requireControlPath(addressByShortName, "controls_low_band_ratio_bias", meta.name),
    midHighThresholdOffsetDb: requireControlPath(
      addressByShortName,
      "controls_mid_high_threshold_offset_db",
      meta.name
    ),
    outputCeilingDb: requireControlPath(addressByShortName, "controls_output_ceiling_db", meta.name),
    outputSoftClipMix: requireControlPath(addressByShortName, "controls_output_soft_clip_mix", meta.name),
    clarityPresenceTiltDb: requireControlPath(
      addressByShortName,
      "controls_clarity_presence_tilt_db",
      meta.name
    ),
    toneLowBandGainDb: requireControlPath(addressByShortName, "controls_tone_low_band_gain_db", meta.name),
    toneMidBandGainDb: requireControlPath(addressByShortName, "controls_tone_mid_band_gain_db", meta.name)
  };
}
