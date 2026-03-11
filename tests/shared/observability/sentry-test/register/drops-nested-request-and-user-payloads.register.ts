import { runDropsNestedRequestAndUserPayloadsCase } from "../callback/drops-nested-request-and-user-payloads.callback";

export function registerDropsNestedRequestAndUserPayloadsCase(): void {
  it("drops nested request and user payloads while scrubbing all tracked url field names", runDropsNestedRequestAndUserPayloadsCase);
}
