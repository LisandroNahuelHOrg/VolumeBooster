import {
  completeBuildEnv,
  sentryRuntimeDsn
} from "../fixtures/build-envs";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";

export async function runRuntimeEnabledWithDsnCase() {
  const module = await loadSentryBuildModule();

  expect(module.isSentryRuntimeEnabled({})).toBe(false);
  expect(module.isSentryRuntimeEnabled({ VITE_SENTRY_DSN: "" })).toBe(false);
  expect(module.isSentryRuntimeEnabled({ VITE_SENTRY_DSN: "   " })).toBe(false);
  expect(module.isSentryRuntimeEnabled({ VITE_SENTRY_DSN: sentryRuntimeDsn })).toBe(true);
  expect(module.isSentryRuntimeEnabled(completeBuildEnv)).toBe(true);
}
