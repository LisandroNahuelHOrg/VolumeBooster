import type { RuntimeContext } from "../../../types";

export const sentryRuntimeState = {
  sdkInitialized: false,
  runtimeEnabled: false,
  initializedContexts: new Set<RuntimeContext>(),
  boundGlobalListenerContexts: new Set<RuntimeContext>()
};
