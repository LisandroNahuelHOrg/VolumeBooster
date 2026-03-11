import { runScrubsSensitiveDataBeforeSendingCase } from "../callback/scrubs-sensitive-data-before-sending.callback";

export function registerScrubsSensitiveDataBeforeSendingCase(): void {
  it("scrubs sensitive data from events before sending", runScrubsSensitiveDataBeforeSendingCase);
}
