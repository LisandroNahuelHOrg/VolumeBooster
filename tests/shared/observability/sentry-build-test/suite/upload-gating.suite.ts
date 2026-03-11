import { registerSourcemapUploadRequiresReleaseCredentialsCase } from "../register/sourcemap-upload-requires-release-credentials.register";

export function defineUploadGatingSuite(): void {
  registerSourcemapUploadRequiresReleaseCredentialsCase();
}
