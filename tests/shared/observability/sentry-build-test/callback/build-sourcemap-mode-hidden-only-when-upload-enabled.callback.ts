import { completeBuildEnv, sentryRuntimeDsn } from "../fixtures/build-envs";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runBuildSourcemapModeHiddenOnlyWhenUploadEnabledCase() {
  const module = await loadSentryBuildModule();

  expect(module.getSentryBuildSourcemapMode({})).toBe(false);
  expect(
    module.getSentryBuildSourcemapMode({
      VITE_SENTRY_DSN: sentryRuntimeDsn
    })
  ).toBe(false);
  expect(module.getSentryBuildSourcemapMode(completeBuildEnv)).toBe("hidden");
}
