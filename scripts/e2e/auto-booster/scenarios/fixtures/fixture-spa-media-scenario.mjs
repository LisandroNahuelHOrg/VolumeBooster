import { runAttachedFixtureScenario } from "./run-attached-fixture-scenario.mjs";

export const fixtureSpaMediaScenario = {
  mode: "global",
  name: "fixture-spa-media",
  path: "/spa-media.html",
  run: runAttachedFixtureScenario,
  waitForSelector: "#fixture-audio"
};
