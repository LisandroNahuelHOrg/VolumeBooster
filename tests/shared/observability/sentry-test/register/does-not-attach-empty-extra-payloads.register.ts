import { runDoesNotAttachEmptyExtraPayloadsCase } from "../callback/does-not-attach-empty-extra-payloads.callback";

export function registerDoesNotAttachEmptyExtraPayloadsCase(): void {
  it("does not attach empty extra payloads to sentry scopes", runDoesNotAttachEmptyExtraPayloadsCase);
}
