import { expect, test } from "vitest";
import { LOUDNESS_LUFS_OFFSET_DB } from "./loudness-constants";
import { calculateGatedShortTermLoudnessDb } from "./calculate-gated-short-term-loudness-db";

test("excludes blocks that fall more than 10 LU below the ungated short-term loudness", () => {
  const loudnessToEnergy = (loudnessDb: number) =>
    Math.pow(10, (loudnessDb - LOUDNESS_LUFS_OFFSET_DB) / 10);

  const gated = calculateGatedShortTermLoudnessDb(
    [
      {
        durationMs: 1500,
        energy: loudnessToEnergy(-20),
        loudnessDb: -20
      },
      {
        durationMs: 1500,
        energy: loudnessToEnergy(-42),
        loudnessDb: -42
      }
    ],
    -20
  );

  expect(gated).toBe(-20);
});
