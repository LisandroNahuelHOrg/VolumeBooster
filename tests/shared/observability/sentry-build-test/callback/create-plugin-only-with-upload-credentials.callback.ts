import { completeBuildEnv } from "../fixtures/build-envs";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runCreatePluginOnlyWithUploadCredentialsCase() {
  const module = await loadSentryBuildModule();

  expect(module.createSentryVitePlugin({})).toBeNull();
  expect(module.createSentryVitePlugin(completeBuildEnv)).toBeTruthy();
}
