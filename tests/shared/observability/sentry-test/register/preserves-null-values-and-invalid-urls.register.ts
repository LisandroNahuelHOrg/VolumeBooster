import { runPreservesNullValuesAndInvalidUrlsCase } from "../callback/preserves-null-values-and-invalid-urls.callback";

export function registerPreservesNullValuesAndInvalidUrlsCase(): void {
  it("preserves null values, drops undefined object entries, and leaves plain invalid urls intact", runPreservesNullValuesAndInvalidUrlsCase);
}
