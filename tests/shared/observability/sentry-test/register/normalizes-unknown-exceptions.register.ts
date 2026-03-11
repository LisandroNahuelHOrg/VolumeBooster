import { runNormalizesUnknownExceptionsCase } from "../callback/normalizes-unknown-exceptions.callback";

export function registerNormalizesUnknownExceptionsCase(): void {
  it("normalizes unknown exceptions to a safe Error instance", runNormalizesUnknownExceptionsCase);
}
