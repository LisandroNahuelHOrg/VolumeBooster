import { runScrubsEventsThroughBeforeSendCase } from "../callback/scrubs-events-through-before-send.callback";

export function registerScrubsEventsThroughBeforeSendCase(): void {
  it("scrubs events through beforeSend and removes request payloads", runScrubsEventsThroughBeforeSendCase);
}
