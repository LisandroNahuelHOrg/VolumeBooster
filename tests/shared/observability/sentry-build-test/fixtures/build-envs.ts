export const sentryRuntimeDsn = "https://public@example.ingest.sentry.io/1";
export const sentryRelease = "release-123";
export const sentryAuthToken = "token";
export const sentryOrg = "org";
export const sentryProject = "project";

export const completeBuildEnv = {
  SENTRY_AUTH_TOKEN: sentryAuthToken,
  SENTRY_ORG: sentryOrg,
  SENTRY_PROJECT: sentryProject,
  VITE_SENTRY_DSN: sentryRuntimeDsn,
  VITE_SENTRY_RELEASE: sentryRelease
};

export const blankProjectBuildEnv = {
  ...completeBuildEnv,
  SENTRY_PROJECT: "   "
};

export const missingDsnBuildEnv = {
  SENTRY_AUTH_TOKEN: sentryAuthToken,
  SENTRY_ORG: sentryOrg,
  SENTRY_PROJECT: sentryProject,
  VITE_SENTRY_RELEASE: sentryRelease
};

export const missingAuthTokenBuildEnv = {
  SENTRY_ORG: sentryOrg,
  SENTRY_PROJECT: sentryProject,
  VITE_SENTRY_DSN: sentryRuntimeDsn,
  VITE_SENTRY_RELEASE: sentryRelease
};

export const missingOrgBuildEnv = {
  SENTRY_AUTH_TOKEN: sentryAuthToken,
  SENTRY_PROJECT: sentryProject,
  VITE_SENTRY_DSN: sentryRuntimeDsn,
  VITE_SENTRY_RELEASE: sentryRelease
};

export const missingProjectBuildEnv = {
  SENTRY_AUTH_TOKEN: sentryAuthToken,
  SENTRY_ORG: sentryOrg,
  VITE_SENTRY_DSN: sentryRuntimeDsn,
  VITE_SENTRY_RELEASE: sentryRelease
};

export const missingReleaseBuildEnv = {
  SENTRY_AUTH_TOKEN: sentryAuthToken,
  SENTRY_ORG: sentryOrg,
  SENTRY_PROJECT: sentryProject,
  VITE_SENTRY_DSN: sentryRuntimeDsn
};
