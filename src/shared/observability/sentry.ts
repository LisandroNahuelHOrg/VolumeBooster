/**
 * @fileoverview Shared Sentry runtime helpers for MV3 extension contexts.
 * Phase 1 instruments popup, offscreen, automation, and background only.
 */
export type { SentryMessageLevel, SentryRuntimeEnv } from "./sentry/public-types";
export { captureExceptionSafe } from "./sentry/internal/capture/capture-exception-safe";
export { captureMessageSafe } from "./sentry/internal/capture/capture-message-safe";
export { isSentrySmokeMirrorEnabled } from "./sentry/internal/config/is-sentry-smoke-mirror-enabled";
export { resolveSentryRuntimeConfig } from "./sentry/internal/config/resolve-sentry-runtime-config";
export { initSentryForContext } from "./sentry/internal/listeners/init-sentry-for-context";
export { scrubSentryEvent } from "./sentry/internal/privacy/scrub-sentry-event";
export { createSmokeMirroredFetch } from "./sentry/internal/smoke-mirror/create-smoke-mirrored-fetch";
export {
  readSentrySmokeMirrorEntries,
  readSentrySmokeMirrorEntries as readSentrySmokeMirrorForTests
} from "./sentry/internal/smoke-mirror/read-sentry-smoke-mirror-entries";
export { resetSentrySmokeMirrorForTests } from "./sentry/internal/smoke-mirror/reset-sentry-smoke-mirror-for-tests";
export { filterSentryIntegrations } from "./sentry/internal/sdk/filter-sentry-integrations";
export { resetSentryStateForTests } from "./sentry/internal/sdk/reset-sentry-state-for-tests";
