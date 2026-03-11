import { missingDsnBuildEnv } from "../fixtures/build-envs";
import { sentryVitePluginMock } from "../state/plugin-mocks";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runIncompleteUploadMissingDsnCase() {
  const module = await loadSentryBuildModule();

  expect(module.createSentryVitePlugin(missingDsnBuildEnv)).toBeNull();
  expect(sentryVitePluginMock).not.toHaveBeenCalled();
}
