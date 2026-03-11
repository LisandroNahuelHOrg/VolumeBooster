import { registerIncompleteUploadMissingAuthTokenCase } from "../register/incomplete-upload-missing-auth-token.register";
import { registerIncompleteUploadMissingDsnCase } from "../register/incomplete-upload-missing-dsn.register";
import { registerIncompleteUploadMissingOrgCase } from "../register/incomplete-upload-missing-org.register";
import { registerIncompleteUploadMissingProjectCase } from "../register/incomplete-upload-missing-project.register";
import { registerIncompleteUploadMissingReleaseCase } from "../register/incomplete-upload-missing-release.register";

export function definePluginIncompleteMatrixSuite(): void {
  registerIncompleteUploadMissingDsnCase();
  registerIncompleteUploadMissingAuthTokenCase();
  registerIncompleteUploadMissingOrgCase();
  registerIncompleteUploadMissingProjectCase();
  registerIncompleteUploadMissingReleaseCase();
}
