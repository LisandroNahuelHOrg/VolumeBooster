import { clickIfPresent } from "./click-if-present.mjs";

export async function startYouTubeMusicPlayback(page) {
  if (await clickIfPresent(page, "tp-yt-paper-icon-button[title*='Play']")) {
    return true;
  }

  try {
    await page.keyboard.press("k");
  } catch {
    // Ignore hotkey failures and fall back to probing the player element.
  }

  return Boolean(await page.locator("video").count());
}
