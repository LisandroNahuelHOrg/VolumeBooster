import { wait } from "../waiters/wait.mjs";
import { clickIfPresent } from "./click-if-present.mjs";

export async function startTwitchPlayback(page) {
  if (await clickIfPresent(page, "[data-a-target='content-classification-gate-overlay-start-watching-button']")) {
    await wait(500);
  }

  if (await clickIfPresent(page, "[data-a-target='player-play-pause-button']")) {
    return true;
  }

  return clickIfPresent(page, "video");
}
