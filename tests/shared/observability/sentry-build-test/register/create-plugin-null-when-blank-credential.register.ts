import { runCreatePluginNullWhenBlankCredentialCase } from "../callback/create-plugin-null-when-blank-credential.callback";

export function registerCreatePluginNullWhenBlankCredentialCase(): void {
  it("returns null when any upload credential is blank after trimming", runCreatePluginNullWhenBlankCredentialCase);
}
