import { runOmitsOptionalReleaseTagsCase } from "../callback/omits-optional-release-tags.callback";

export function registerOmitsOptionalReleaseTagsCase(): void {
  it("omits optional release tags when manifest version and release are unavailable", runOmitsOptionalReleaseTagsCase);
}
