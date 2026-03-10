import { roundTo } from "./internal/round-to";

/** Computes the remaining output headroom before clipping, in decibels. */
export function deriveClippingSafetyMarginDb(outputPeak: number): number | null {
  if (!Number.isFinite(outputPeak) || outputPeak <= 0.015) {
    return null;
  }

  return roundTo(20 * Math.log10(1 / Math.max(outputPeak, 1e-4)), 1);
}
