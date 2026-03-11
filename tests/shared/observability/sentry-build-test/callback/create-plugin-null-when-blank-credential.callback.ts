import { blankProjectBuildEnv } from "../fixtures/build-envs";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runCreatePluginNullWhenBlankCredentialCase() {
  const module = await loadSentryBuildModule();

  expect(module.createSentryVitePlugin(blankProjectBuildEnv)).toBeNull();
}
