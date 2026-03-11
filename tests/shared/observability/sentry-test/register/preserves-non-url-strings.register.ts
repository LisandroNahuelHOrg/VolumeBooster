import { runPreservesNonUrlStringsCase } from "../callback/preserves-non-url-strings.callback";

export function registerPreservesNonUrlStringsCase(): void {
  it("preserves non-url strings and strips nested request-like fields from payloads", runPreservesNonUrlStringsCase);
}
