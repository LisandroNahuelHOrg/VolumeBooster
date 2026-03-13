import { roundTo } from "./internal/round-to";

export function mapNormalizationTargetPercentToLoudnessDb(targetPercent: number): number {
  return roundTo(-24 + ((targetPercent - 80) / 40) * 10, 2);
}
