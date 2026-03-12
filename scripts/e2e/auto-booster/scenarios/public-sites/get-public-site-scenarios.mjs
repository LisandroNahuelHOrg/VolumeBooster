import { kickGlobalScenario } from "./kick-global-scenario.mjs";
import { rumbleGlobalScenario } from "./rumble-global-scenario.mjs";
import { twitchGlobalScenario } from "./twitch-global-scenario.mjs";
import { youtubeGlobalScenario } from "./youtube-global-scenario.mjs";
import { youtubeMusicGlobalScenario } from "./youtube-music-global-scenario.mjs";
import { youtubeSiteScenario } from "./youtube-site-scenario.mjs";

export function getPublicSiteScenarios(siteFilter, scenarioFilter) {
  const selected = [];
  const scenarios = [
    youtubeGlobalScenario,
    youtubeSiteScenario,
    youtubeMusicGlobalScenario,
    twitchGlobalScenario,
    kickGlobalScenario,
    rumbleGlobalScenario
  ];

  for (const scenario of scenarios) {
    if (siteFilter.size > 0 && !siteFilter.has(scenario.name)) {
      continue;
    }

    if (scenarioFilter.size > 0 && !scenarioFilter.has(scenario.name)) {
      continue;
    }

    selected.push(scenario);
  }

  return selected;
}
