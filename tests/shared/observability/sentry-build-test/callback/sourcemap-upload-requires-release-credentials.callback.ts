import {
  completeBuildEnv,
  missingAuthTokenBuildEnv,
  sentryAuthToken,
  sentryOrg,
  sentryProject,
  sentryRelease,
  sentryRuntimeDsn
} from "../fixtures/build-envs";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runSourcemapUploadRequiresReleaseCredentialsCase() {
  const module = await loadSentryBuildModule();

  expect(
    module.isSentrySourcemapUploadEnabled({
      SENTRY_AUTH_TOKEN: sentryAuthToken,
      SENTRY_ORG: sentryOrg,
      SENTRY_PROJECT: sentryProject,
      VITE_SENTRY_RELEASE: sentryRelease
    })
  ).toBe(false);

  expect(
    module.isSentrySourcemapUploadEnabled({
      SENTRY_AUTH_TOKEN: sentryAuthToken,
      SENTRY_ORG: sentryOrg,
      VITE_SENTRY_DSN: sentryRuntimeDsn,
      VITE_SENTRY_RELEASE: sentryRelease
    })
  ).toBe(false);

  expect(module.isSentrySourcemapUploadEnabled(completeBuildEnv)).toBe(true);
  expect(module.isSentrySourcemapUploadEnabled({ ...missingAuthTokenBuildEnv, SENTRY_ORG: " " })).toBe(false);
}
