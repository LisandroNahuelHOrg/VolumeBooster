import { missingReleaseBuildEnv } from "../fixtures/build-envs";
import { sentryVitePluginMock } from "../state/plugin-mocks";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runIncompleteUploadMissingReleaseCase() {
  const module = await loadSentryBuildModule();

  expect(module.createSentryVitePlugin(missingReleaseBuildEnv)).toBeNull();
  expect(sentryVitePluginMock).not.toHaveBeenCalled();
}
