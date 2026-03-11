import { runCapturesExceptionsAndMessagesSafelyCase } from "../callback/captures-exceptions-and-messages-safely.callback";

export function registerCapturesExceptionsAndMessagesSafelyCase(): void {
  it("captures exceptions and messages safely with sanitized extras", runCapturesExceptionsAndMessagesSafelyCase);
}
