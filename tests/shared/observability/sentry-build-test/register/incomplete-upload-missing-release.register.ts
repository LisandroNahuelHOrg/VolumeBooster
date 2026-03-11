import { runIncompleteUploadMissingReleaseCase } from "../callback/incomplete-upload-missing-release.callback";

export function registerIncompleteUploadMissingReleaseCase(): void {
  it(
    "does not create the Vite plugin when upload setup is incomplete: missing release",
    runIncompleteUploadMissingReleaseCase
  );
}
