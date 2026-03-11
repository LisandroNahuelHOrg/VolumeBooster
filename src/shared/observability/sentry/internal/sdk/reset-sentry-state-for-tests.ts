import { sentryRuntimeState } from "../runtime-state";
import { resetSentrySmokeMirrorForTests } from "../smoke-mirror/reset-sentry-smoke-mirror-for-tests";

export function resetSentryStateForTests(): void {
  sentryRuntimeState.sdkInitialized = false;
  sentryRuntimeState.runtimeEnabled = false;
  sentryRuntimeState.initializedContexts.clear();
  sentryRuntimeState.boundGlobalListenerContexts.clear();
  resetSentrySmokeMirrorForTests();
}
