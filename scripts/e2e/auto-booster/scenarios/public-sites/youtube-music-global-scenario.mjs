import { startYouTubeMusicPlayback } from "../../playback/start-youtube-music-playback.mjs";

export const youtubeMusicGlobalScenario = {
  mode: "global",
  name: "youtube-music-global",
  startPlayback: startYouTubeMusicPlayback,
  url: "https://music.youtube.com/watch?v=jNQXAC9IVRw"
};
