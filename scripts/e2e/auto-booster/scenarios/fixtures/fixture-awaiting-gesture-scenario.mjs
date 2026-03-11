import { runAwaitingGestureFixtureScenario } from "./run-awaiting-gesture-fixture-scenario.mjs";

export const fixtureAwaitingGestureScenario = {
  mode: "global",
  name: "fixture-awaiting-gesture",
  path: "/audio-autoplay-blocked.html",
  run: runAwaitingGestureFixtureScenario
};
