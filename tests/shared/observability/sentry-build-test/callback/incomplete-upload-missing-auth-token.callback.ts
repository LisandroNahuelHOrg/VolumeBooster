import { missingAuthTokenBuildEnv } from "../fixtures/build-envs";
import { sentryVitePluginMock } from "../state/plugin-mocks";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runIncompleteUploadMissingAuthTokenCase() {
  const module = await loadSentryBuildModule();

  expect(module.createSentryVitePlugin(missingAuthTokenBuildEnv)).toBeNull();
  expect(sentryVitePluginMock).not.toHaveBeenCalled();
}
