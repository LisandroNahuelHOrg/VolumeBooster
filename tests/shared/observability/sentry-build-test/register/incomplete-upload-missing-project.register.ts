import { runIncompleteUploadMissingProjectCase } from "../callback/incomplete-upload-missing-project.callback";

export function registerIncompleteUploadMissingProjectCase(): void {
  it(
    "does not create the Vite plugin when upload setup is incomplete: missing project",
    runIncompleteUploadMissingProjectCase
  );
}
