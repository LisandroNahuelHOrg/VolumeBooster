import { registerResolvesRuntimeConfigFromEnvCase } from "../register/resolves-runtime-config-from-env.register";
import { registerKeepsExtensionVersionUndefinedWhenGetmanifestMissingCase } from "../register/keeps-extension-version-undefined-when-getmanifest-missing.register";
import { registerTrimsRuntimeConfigValuesAndFallsBackToModeCase } from "../register/trims-runtime-config-values-and-falls-back-to-mode.register";
import { registerEnablesSmokeMirrorForTruthyFlagsCase } from "../register/enables-smoke-mirror-for-truthy-flags.register";

export function defineRuntimeConfigAndFlagsSuite(): void {
  registerResolvesRuntimeConfigFromEnvCase();
  registerKeepsExtensionVersionUndefinedWhenGetmanifestMissingCase();
  registerTrimsRuntimeConfigValuesAndFallsBackToModeCase();
  registerEnablesSmokeMirrorForTruthyFlagsCase();
}
