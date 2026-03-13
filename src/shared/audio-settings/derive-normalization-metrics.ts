import type { DspRuntimeMetrics } from "../types";
import type { DspRuntimeParameters } from "./contracts";
import { clamp } from "./internal/clamp";
import { roundTo } from "./internal/round-to";

export function deriveNormalizationMetrics(
  runtime: DspRuntimeParameters,
  inputLoudnessDb: number | null,
  previousMetrics: DspRuntimeMetrics
): Pick<
  DspRuntimeMetrics,
  | "normalizationAction"
  | "normalizationAppliedGainDb"
  | "normalizationInputLoudnessDb"
  | "normalizationLoadPercent"
  | "normalizationOffsetScore"
> {
  if (!runtime.normalization.enabled) {
    return {
      normalizationInputLoudnessDb: inputLoudnessDb,
      normalizationAppliedGainDb: 0,
      normalizationOffsetScore: 0,
      normalizationAction: "holding",
      normalizationLoadPercent: 0
    };
  }

  const previousGainDb = previousMetrics.normalizationAppliedGainDb;
  const rawDesiredGainDb =
    inputLoudnessDb === null || !Number.isFinite(inputLoudnessDb)
      ? 0
      : runtime.normalization.targetLoudnessDb - inputLoudnessDb;
  const desiredGainDb = clamp(
    rawDesiredGainDb,
    -runtime.normalization.maxCutDb,
    runtime.normalization.maxBoostDb
  );
  const stepMs =
    Math.abs(desiredGainDb) > Math.abs(previousGainDb)
      ? runtime.normalization.attackMs
      : runtime.normalization.releaseMs;
  const alpha = clamp(20 / Math.max(stepMs, 20), 0.08, 1);
  const nextGainDb = roundTo(previousGainDb + (desiredGainDb - previousGainDb) * alpha, 2);
  const capped = Math.abs(rawDesiredGainDb - desiredGainDb) >= 0.15;
  const score = roundTo(
    clamp(
      (-rawDesiredGainDb / runtime.normalization.fullScaleWindowDb) * 100,
      -100,
      100
    ),
    0
  );
  const loadBase = nextGainDb >= 0 ? runtime.normalization.maxBoostDb : runtime.normalization.maxCutDb;

  return {
    normalizationInputLoudnessDb:
      inputLoudnessDb === null || !Number.isFinite(inputLoudnessDb)
        ? null
        : roundTo(inputLoudnessDb, 2),
    normalizationAppliedGainDb: nextGainDb,
    normalizationOffsetScore: score,
    normalizationAction: capped
      ? "capped"
      : desiredGainDb > 0.15
        ? "raising"
        : desiredGainDb < -0.15
          ? "lowering"
          : "holding",
    normalizationLoadPercent:
      loadBase <= 0 ? 0 : roundTo(clamp((Math.abs(nextGainDb) / loadBase) * 100, 0, 100), 0)
  };
}
