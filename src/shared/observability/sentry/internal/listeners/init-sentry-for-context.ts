import * as Sentry from "@sentry/browser";

import type { RuntimeContext } from "../../../../types";
import type { SentryRuntimeEnv } from "../../public-types";
import type { ChromeRuntimeLike, EventTargetLike } from "../types";
import { createSentryInitOptions } from "../config/create-sentry-init-options";
import { resolveSentryRuntimeConfig } from "../config/resolve-sentry-runtime-config";
import { sentryRuntimeState } from "../runtime-state";
import { asEventTarget } from "./as-event-target";
import { bindGlobalErrorListeners } from "./bind-global-error-listeners";

export function initSentryForContext(
  context: RuntimeContext,
  env: Partial<SentryRuntimeEnv> = import.meta.env,
  runtime: ChromeRuntimeLike | undefined = globalThis.chrome?.runtime,
  globalEventTarget: EventTargetLike | undefined = asEventTarget(globalThis)
): void {
  if (sentryRuntimeState.initializedContexts.has(context)) {
    return;
  }

  const config = resolveSentryRuntimeConfig(env, runtime);

  if (!config.enabled) {
    sentryRuntimeState.initializedContexts.add(context);
    return;
  }

  if (sentryRuntimeState.sdkInitialized) {
    sentryRuntimeState.runtimeEnabled = true;
    bindGlobalErrorListeners(context, globalEventTarget);
    sentryRuntimeState.initializedContexts.add(context);
    return;
  }

  try {
    Sentry.init(createSentryInitOptions(context, env, config));
    sentryRuntimeState.runtimeEnabled = true;
    sentryRuntimeState.sdkInitialized = true;
    bindGlobalErrorListeners(context, globalEventTarget);
    sentryRuntimeState.initializedContexts.add(context);
  } catch {
    sentryRuntimeState.runtimeEnabled = false;
  }
}
