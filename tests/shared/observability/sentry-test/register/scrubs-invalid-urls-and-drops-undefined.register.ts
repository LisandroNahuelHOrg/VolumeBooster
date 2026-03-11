import { runScrubsInvalidUrlsAndDropsUndefinedCase } from "../callback/scrubs-invalid-urls-and-drops-undefined.callback";

export function registerScrubsInvalidUrlsAndDropsUndefinedCase(): void {
  it("scrubs invalid URLs and drops undefined entries from structured payloads", runScrubsInvalidUrlsAndDropsUndefinedCase);
}
