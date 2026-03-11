import { clickIfPresent } from "./click-if-present.mjs";

export async function dismissCommonBanners(page) {
  await clickIfPresent(page, "button:has-text('Accept all')");
  await clickIfPresent(page, "button:has-text('I agree')");
  await clickIfPresent(page, "button:has-text('Accept')");
  await clickIfPresent(page, "button:has-text('Reject all')");
}
