import { runIgnoresBlankGlobalErrorMessagesCase } from "../callback/ignores-blank-global-error-messages.callback";

export function registerIgnoresBlankGlobalErrorMessagesCase(): void {
  it("ignores blank global error messages and captures non-empty string-only errors", runIgnoresBlankGlobalErrorMessagesCase);
}
