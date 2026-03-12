import { MAX_GAIN_PERCENT, MIN_GAIN_PERCENT } from "../../../shared/constants";
import { clampGainPercent } from "../../../shared/gain";

export function getSliderProgressPercent(gainPercent: number): number {
  return (
    ((clampGainPercent(gainPercent) - MIN_GAIN_PERCENT) /
      (MAX_GAIN_PERCENT - MIN_GAIN_PERCENT)) *
    100
  );
}
