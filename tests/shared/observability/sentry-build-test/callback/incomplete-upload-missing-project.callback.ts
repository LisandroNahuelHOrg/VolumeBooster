import { missingProjectBuildEnv } from "../fixtures/build-envs";
import { sentryVitePluginMock } from "../state/plugin-mocks";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runIncompleteUploadMissingProjectCase() {
  const module = await loadSentryBuildModule();

  expect(module.createSentryVitePlugin(missingProjectBuildEnv)).toBeNull();
  expect(sentryVitePluginMock).not.toHaveBeenCalled();
}
