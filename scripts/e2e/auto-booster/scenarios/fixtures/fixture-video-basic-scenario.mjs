import { runAttachedFixtureScenario } from "./run-attached-fixture-scenario.mjs";

export const fixtureVideoBasicScenario = {
  mode: "global",
  name: "fixture-video-basic",
  path: "/video-basic.html",
  run: runAttachedFixtureScenario
};
