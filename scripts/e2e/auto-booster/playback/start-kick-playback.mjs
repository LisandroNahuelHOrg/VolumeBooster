import { clickIfPresent } from "./click-if-present.mjs";

export async function startKickPlayback(page) {
  if (await clickIfPresent(page, "button[aria-label*='Play']")) {
    return true;
  }

  return clickIfPresent(page, "video");
}
