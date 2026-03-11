import type { RuntimeContext } from "../../../../types";
import type { SentryRuntimeConfig, SentryScopeLike } from "../types";

export function applyInitialScope(
  context: RuntimeContext,
  config: SentryRuntimeConfig,
  scope: SentryScopeLike
): SentryScopeLike {
  scope.setTag("runtime_context", context);
  scope.setTag("environment", config.environment);

  if (config.extensionVersion) {
    scope.setTag("extension_version", config.extensionVersion);
  }

  if (config.release) {
    scope.setTag("release", config.release);
  }

  return scope;
}
