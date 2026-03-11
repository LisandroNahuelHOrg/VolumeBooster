import type { SentryRuntimeEnv } from "../../public-types";
import type { ChromeRuntimeLike, SentryRuntimeConfig } from "../types";
import { readNonEmptyString } from "./read-non-empty-string";

export function resolveSentryRuntimeConfig(
  env: Partial<SentryRuntimeEnv>,
  runtime: ChromeRuntimeLike | undefined = globalThis.chrome?.runtime
): SentryRuntimeConfig {
  const dsn = readNonEmptyString(env.VITE_SENTRY_DSN);
  const environment =
    readNonEmptyString(env.VITE_SENTRY_ENVIRONMENT) ||
    (env.DEV ? "development" : readNonEmptyString(env.MODE) || "production");
  const release = readNonEmptyString(env.VITE_SENTRY_RELEASE);
  const extensionVersion = runtime?.getManifest?.().version;

  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    extensionVersion,
    release
  };
}
