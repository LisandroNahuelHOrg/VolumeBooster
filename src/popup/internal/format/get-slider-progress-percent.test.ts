import { expect, test } from "vitest";
import { MAX_GAIN_PERCENT, MIN_GAIN_PERCENT } from "../../../shared/constants";
import { getSliderProgressPercent } from "./get-slider-progress-percent";

test("normalizes slider progress and clamps values outside the supported gain range", () => {
  expect(getSliderProgressPercent(MIN_GAIN_PERCENT)).toBe(0);
  expect(getSliderProgressPercent(MAX_GAIN_PERCENT)).toBe(100);
  expect(getSliderProgressPercent(MIN_GAIN_PERCENT - 50)).toBe(0);
  expect(getSliderProgressPercent(MAX_GAIN_PERCENT + 50)).toBe(100);
  expect(getSliderProgressPercent(MIN_GAIN_PERCENT + 5)).toBeGreaterThan(0);
  expect(getSliderProgressPercent(MAX_GAIN_PERCENT - 5)).toBeLessThan(100);
});
