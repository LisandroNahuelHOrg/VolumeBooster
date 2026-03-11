import { missingOrgBuildEnv } from "../fixtures/build-envs";
import { sentryVitePluginMock } from "../state/plugin-mocks";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runIncompleteUploadMissingOrgCase() {
  const module = await loadSentryBuildModule();

  expect(module.createSentryVitePlugin(missingOrgBuildEnv)).toBeNull();
  expect(sentryVitePluginMock).not.toHaveBeenCalled();
}
