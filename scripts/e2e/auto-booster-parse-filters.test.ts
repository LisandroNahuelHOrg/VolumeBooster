import { expect, test } from "vitest";
import { parseScenarioFilter } from "./auto-booster/cli/parse-scenario-filter.mjs";
import { parseSiteFilter } from "./auto-booster/cli/parse-site-filter.mjs";

test("trims site and scenario filters while ignoring blank values", () => {
  expect(Array.from(parseSiteFilter(["node", "script", "--sites= youtube-global , , twitch-global "]))).toEqual([
    "youtube-global",
    "twitch-global"
  ]);
  expect(Array.from(parseScenarioFilter(["node", "script", "--scenarios= fixture-no-media , , fixture-awaiting-gesture "]))).toEqual([
    "fixture-no-media",
    "fixture-awaiting-gesture"
  ]);
});
