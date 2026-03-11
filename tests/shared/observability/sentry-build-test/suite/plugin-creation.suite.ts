import { registerCreatePluginNullWhenBlankCredentialCase } from "../register/create-plugin-null-when-blank-credential.register";
import { registerCreatePluginOnlyWithUploadCredentialsCase } from "../register/create-plugin-only-with-upload-credentials.register";

export function definePluginCreationSuite(): void {
  registerCreatePluginOnlyWithUploadCredentialsCase();
  registerCreatePluginNullWhenBlankCredentialCase();
}
