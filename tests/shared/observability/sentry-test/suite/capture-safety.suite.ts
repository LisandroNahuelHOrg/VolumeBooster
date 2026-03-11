import { registerCapturesExceptionsAndMessagesSafelyCase } from "../register/captures-exceptions-and-messages-safely.register";
import { registerDoesNotAttachEmptyExtraPayloadsCase } from "../register/does-not-attach-empty-extra-payloads.register";
import { registerNormalizesUnknownExceptionsCase } from "../register/normalizes-unknown-exceptions.register";
import { registerBlankStringExceptionsAreUnknownCase } from "../register/blank-string-exceptions-are-unknown.register";
import { registerSwallowsSdkFailuresCase } from "../register/swallows-sdk-failures.register";

export function defineCaptureSafetySuite(): void {
  registerCapturesExceptionsAndMessagesSafelyCase();
  registerDoesNotAttachEmptyExtraPayloadsCase();
  registerNormalizesUnknownExceptionsCase();
  registerBlankStringExceptionsAreUnknownCase();
  registerSwallowsSdkFailuresCase();
}
