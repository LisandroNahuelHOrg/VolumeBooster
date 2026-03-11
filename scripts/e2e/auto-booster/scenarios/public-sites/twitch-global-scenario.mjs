import { startTwitchPlayback } from "../../playback/start-twitch-playback.mjs";

export const twitchGlobalScenario = {
  mode: "global",
  name: "twitch-global",
  startPlayback: startTwitchPlayback,
  url: "https://www.twitch.tv/monstercat"
};
