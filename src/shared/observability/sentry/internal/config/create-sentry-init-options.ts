import type { BrowserOptions } from "@sentry/browser";

import type { RuntimeContext } from "../../../../types";
import type { SentryRuntimeEnv } from "../../public-types";
import type { SentryRuntimeConfig } from "../types";
import { applyInitialScopeContext } from "../listeners/apply-initial-scope-context";
import { beforeSendSentryEvent } from "../privacy/before-send-sentry-event";
import { filterSentryIntegrations } from "../sdk/filter-sentry-integrations";
import { createSentryTransportFactory } from "./create-sentry-transport-factory";
import { isSentrySmokeMirrorEnabled } from "./is-sentry-smoke-mirror-enabled";

export function createSentryInitOptions(
  context: RuntimeContext,
  env: Partial<SentryRuntimeEnv>,
  config: SentryRuntimeConfig
) {
  const options = {
    dsn: config.dsn,
    enabled: true,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: false,
    skipBrowserExtensionCheck: true,
    transport: isSentrySmokeMirrorEnabled(env)
      ? createSentryTransportFactory.bind(undefined, context, env)
      : undefined,
    integrations: filterSentryIntegrations,
    beforeSend: beforeSendSentryEvent,
    initialScope: applyInitialScopeContext.bind(undefined, context, config)
  } satisfies BrowserOptions;

  return options;
}
