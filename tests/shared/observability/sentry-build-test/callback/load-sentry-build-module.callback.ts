export async function loadSentryBuildModule() {
  return import("../../../../../src/shared/observability/sentry-build");
}
