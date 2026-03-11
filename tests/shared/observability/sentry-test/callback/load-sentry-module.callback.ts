export async function loadSentryModule() {
  return import("../../../../../src/shared/observability/sentry");
}
