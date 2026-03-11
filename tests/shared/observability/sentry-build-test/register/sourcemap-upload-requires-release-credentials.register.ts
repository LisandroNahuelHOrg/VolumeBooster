import { runSourcemapUploadRequiresReleaseCredentialsCase } from "../callback/sourcemap-upload-requires-release-credentials.callback";

export function registerSourcemapUploadRequiresReleaseCredentialsCase(): void {
  it(
    "only enables sourcemap upload when all release credentials are present",
    runSourcemapUploadRequiresReleaseCredentialsCase
  );
}
