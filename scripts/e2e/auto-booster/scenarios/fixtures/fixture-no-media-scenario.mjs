import { runNoMediaFixtureScenario } from "./run-no-media-fixture-scenario.mjs";

export const fixtureNoMediaScenario = {
  mode: "global",
  name: "fixture-no-media",
  path: "/no-media.html",
  run: runNoMediaFixtureScenario
};
