import("stdfaust.lib");

co = library("compressors.lib");
fi = library("filters.lib");

inputDriveDb = hslider("[0]controls/input_drive_db[unit:dB]", 0, 0, 30, 0.01);
normalizationEnabled = hslider("[0]controls/normalization_enabled", 0, 0, 1, 1);
normalizationGainDb = hslider("[0]controls/normalization_gain_db[unit:dB]", 0, -18, 18, 0.01);
lookaheadMs = hslider("[0]controls/lookahead_ms[unit:ms]", 5, 1, 8, 0.1);
releaseMs = hslider("[0]controls/release_ms[unit:ms]", 160, 60, 350, 1);
multibandDepth = hslider("[0]controls/multiband_depth", 45, 0, 100, 1);
protectorEnabled = hslider("[0]controls/protector_enabled", 1, 0, 1, 1);
outputLimiterEnabled = hslider("[0]controls/output_limiter_enabled", 1, 0, 1, 1);
lowBandTrimDb = hslider("[0]controls/low_band_trim_db[unit:dB]", 0, -6, 6, 0.01);
lowBandMakeupDb = hslider("[0]controls/low_band_makeup_db[unit:dB]", 0, -6, 6, 0.01);
lowBandThresholdOffsetDb = hslider("[0]controls/low_band_threshold_offset_db[unit:dB]", 0, -12, 6, 0.01);
lowBandRatioBias = hslider("[0]controls/low_band_ratio_bias", 0, -1, 1, 0.01);
midHighThresholdOffsetDb = hslider("[0]controls/mid_high_threshold_offset_db[unit:dB]", 0, -12, 6, 0.01);
outputCeilingDb = hslider("[0]controls/output_ceiling_db[unit:dB]", -1.0, -2.5, -0.1, 0.01);
outputSoftClipMix = hslider("[0]controls/output_soft_clip_mix", 0, 0, 40, 0.1);
clarityPresenceTiltDb = hslider("[0]controls/clarity_presence_tilt_db[unit:dB]", 0, -3, 4, 0.01);
toneLowBandGainDb = hslider("[0]controls/tone_low_band_gain_db[unit:dB]", 0, -6, 6, 0.01);
toneMidBandGainDb = hslider("[0]controls/tone_mid_band_gain_db[unit:dB]", 0, -6, 6, 0.01);

db2linear(x) = pow(10.0, x / 20.0);
clamp01(x) = min(1.0, max(0.0, x));

protectAmt = clamp01(protectorEnabled);
limitAmt = clamp01(outputLimiterEnabled);
normalizationAmt = clamp01(normalizationEnabled);
driveNorm = min(1.0, inputDriveDb / 18.0);
depthNorm = multibandDepth / 100.0;
softNorm = clamp01((outputSoftClipMix / 40.0) * limitAmt);
lookahead = lookaheadMs / 1000.0;
release = releaseMs / 1000.0;
attack = 0.0025 + (1.0 - depthNorm) * 0.0075;
hold = 0.010 + softNorm * 0.022;
knee = 3.5 + depthNorm * 4.5;
limitThreshold = db2linear(outputCeilingDb);
presenceBandGain = db2linear(clarityPresenceTiltDb * 0.25);
airBandGain = db2linear(clarityPresenceTiltDb);

softSat(x) = x / (1.0 + abs(x));
softClip(x) = dry * (1.0 - softNorm) + wet * softNorm
with {
  dry = x;
  drive = 1.0 + softNorm * 1.8;
  wet = softSat(x * drive) / softSat(drive);
};

compStrength(scale, ratioBias) =
  min(0.98, max(0.05, (scale + ratioBias) * (0.16 + depthNorm * 0.92) * (0.24 + driveNorm * 0.76)));
compThreshold(base, offsetDb) = base + offsetDb + (1.0 - driveNorm) * 5.0;

compressBand(scale, baseThreshold, thresholdOffsetDb, ratioBias) =
  co.RMS_FBcompressor_peak_limiter_N_chan(
    compStrength(scale, ratioBias),
    compThreshold(baseThreshold, thresholdOffsetDb),
    limitThreshold,
    attack,
    release,
    knee,
    0,
    _,
    _,
    1
  );

protectedTone =
  fi.crossover3LR4(170, 2400)
  : (
      compressBand(0.74, -18.5, lowBandThresholdOffsetDb, lowBandRatioBias)
        * db2linear(lowBandTrimDb + lowBandMakeupDb),
      compressBand(0.62, -18.0, midHighThresholdOffsetDb, 0.08) * presenceBandGain,
      compressBand(0.56, -17.5, midHighThresholdOffsetDb - clarityPresenceTiltDb * 0.45, 0.05)
        * airBandGain
    )
  :> _;

toneStage =
  fi.crossover3LR4(170, 2400)
  : (
      *(db2linear(toneLowBandGainDb)),
      *(db2linear(toneMidBandGainDb)),
      _
    )
  :> _;

preStage = *(db2linear(inputDriveDb + normalizationGainDb * normalizationAmt)) : fi.highpass(4, 25) : toneStage;
protectedStage = _ <: *(1.0 - protectAmt), (protectedTone : *(protectAmt)) :> _;
limitedStage = _ <: *(1.0 - limitAmt), (co.limiter_lad_mono(lookahead, limitThreshold, attack, hold, release) : *(limitAmt)) :> _;

process = preStage : protectedStage : limitedStage : softClip;
