import { runIncompleteUploadMissingAuthTokenCase } from "../callback/incomplete-upload-missing-auth-token.callback";

export function registerIncompleteUploadMissingAuthTokenCase(): void {
  it(
    "does not create the Vite plugin when upload setup is incomplete: missing auth token",
    runIncompleteUploadMissingAuthTokenCase
  );
}
