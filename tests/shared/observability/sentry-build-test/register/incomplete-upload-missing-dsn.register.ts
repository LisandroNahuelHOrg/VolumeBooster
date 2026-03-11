import { runIncompleteUploadMissingDsnCase } from "../callback/incomplete-upload-missing-dsn.callback";

export function registerIncompleteUploadMissingDsnCase(): void {
  it(
    "does not create the Vite plugin when upload setup is incomplete: missing DSN",
    runIncompleteUploadMissingDsnCase
  );
}
