import { registerScrubsEventsThroughBeforeSendCase } from "../register/scrubs-events-through-before-send.register";
import { registerScrubsSensitiveDataBeforeSendingCase } from "../register/scrubs-sensitive-data-before-sending.register";
import { registerScrubsInvalidUrlsAndDropsUndefinedCase } from "../register/scrubs-invalid-urls-and-drops-undefined.register";
import { registerPreservesNonUrlStringsCase } from "../register/preserves-non-url-strings.register";
import { registerDropsNestedRequestAndUserPayloadsCase } from "../register/drops-nested-request-and-user-payloads.register";
import { registerPreservesNullValuesAndInvalidUrlsCase } from "../register/preserves-null-values-and-invalid-urls.register";

export function definePrivacyScrubberSuite(): void {
  registerScrubsEventsThroughBeforeSendCase();
  registerScrubsSensitiveDataBeforeSendingCase();
  registerScrubsInvalidUrlsAndDropsUndefinedCase();
  registerPreservesNonUrlStringsCase();
  registerDropsNestedRequestAndUserPayloadsCase();
  registerPreservesNullValuesAndInvalidUrlsCase();
}
