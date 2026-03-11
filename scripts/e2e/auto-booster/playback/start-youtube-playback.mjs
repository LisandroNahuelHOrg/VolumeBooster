import { clickIfPresent } from "./click-if-present.mjs";

export async function startYouTubePlayback(page) {
  await clickIfPresent(page, "button[aria-label*='Accept']");

  if (await clickIfPresent(page, ".ytp-play-button")) {
    return true;
  }

  if (await clickIfPresent(page, "video")) {
    return true;
  }

  try {
    await page.keyboard.press("k");
  } catch {
    // Ignore hotkey failures and fall back to probing the player element.
  }

  return Boolean(await page.locator("video").count());
}
