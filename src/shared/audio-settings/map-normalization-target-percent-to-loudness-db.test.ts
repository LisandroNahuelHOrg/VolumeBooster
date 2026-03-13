import { expect, test } from "vitest";
import { mapNormalizationTargetPercentToLoudnessDb } from "../audio-settings";

test("maps normalization target percent onto the expected loudness window", () => {
  expect(mapNormalizationTargetPercentToLoudnessDb(80)).toBe(-24);
  expect(mapNormalizationTargetPercentToLoudnessDb(90)).toBe(-21.5);
  expect(mapNormalizationTargetPercentToLoudnessDb(100)).toBe(-19);
  expect(mapNormalizationTargetPercentToLoudnessDb(120)).toBe(-14);
});
