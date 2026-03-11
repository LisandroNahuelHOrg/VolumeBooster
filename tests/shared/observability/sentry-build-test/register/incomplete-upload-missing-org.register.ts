import { runIncompleteUploadMissingOrgCase } from "../callback/incomplete-upload-missing-org.callback";

export function registerIncompleteUploadMissingOrgCase(): void {
  it("does not create the Vite plugin when upload setup is incomplete: missing org", runIncompleteUploadMissingOrgCase);
}
