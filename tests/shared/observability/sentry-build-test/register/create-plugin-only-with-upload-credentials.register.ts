import { runCreatePluginOnlyWithUploadCredentialsCase } from "../callback/create-plugin-only-with-upload-credentials.callback";

export function registerCreatePluginOnlyWithUploadCredentialsCase(): void {
  it("creates the Vite plugin only when upload credentials exist", runCreatePluginOnlyWithUploadCredentialsCase);
}
