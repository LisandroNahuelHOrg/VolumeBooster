import { expect, test } from "vitest";
import { parseTargets } from "./auto-booster/cli/parse-targets.mjs";

test("defaults targets to all and keeps comma-separated values intact", () => {
  expect(Array.from(parseTargets(["node", "script"]))).toEqual(["all"]);
  expect(Array.from(parseTargets(["node", "script", "--targets=fixtures,public-sites"]))).toEqual([
    "fixtures",
    "public-sites"
  ]);
});
