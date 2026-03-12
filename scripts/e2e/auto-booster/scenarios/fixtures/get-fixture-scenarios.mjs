import { fixtureAwaitingGestureScenario } from "./fixture-awaiting-gesture-scenario.mjs";
import { fixtureGlobalNewTabScenario } from "./fixture-global-new-tab-scenario.mjs";
import { fixtureNoMediaScenario } from "./fixture-no-media-scenario.mjs";
import { fixtureSiteAudioBasicScenario } from "./fixture-site-audio-basic-scenario.mjs";
import { fixtureSpaMediaScenario } from "./fixture-spa-media-scenario.mjs";
import { fixtureVideoBasicScenario } from "./fixture-video-basic-scenario.mjs";

export function getFixtureScenarios(scenarioFilter) {
  const selected = [];
  const scenarios = [
    fixtureSiteAudioBasicScenario,
    fixtureGlobalNewTabScenario,
    fixtureAwaitingGestureScenario,
    fixtureSpaMediaScenario,
    fixtureNoMediaScenario,
    fixtureVideoBasicScenario
  ];

  for (const scenario of scenarios) {
    if (scenarioFilter.size === 0 || scenarioFilter.has(scenario.name)) {
      selected.push(scenario);
    }
  }

  return selected;
}
