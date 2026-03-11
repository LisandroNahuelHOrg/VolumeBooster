import { runKeepsExtensionVersionUndefinedWhenGetmanifestMissingCase } from "../callback/keeps-extension-version-undefined-when-getmanifest-missing.callback";

export function registerKeepsExtensionVersionUndefinedWhenGetmanifestMissingCase(): void {
  it("keeps the extension version undefined when runtime.getManifest is missing", runKeepsExtensionVersionUndefinedWhenGetmanifestMissingCase);
}
