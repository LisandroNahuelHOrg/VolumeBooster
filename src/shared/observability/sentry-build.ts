/**
 * @fileoverview Build-time helpers for conditional Sentry sourcemap upload in Vite.
 */
import { sentryVitePlugin } from "@sentry/vite-plugin";

import type { PluginOption } from "vite";

export interface SentryBuildEnv {
  SENTRY_AUTH_TOKEN?: string;
  SENTRY_ORG?: string;
  SENTRY_PROJECT?: string;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_RELEASE?: string;
}

/**
 * Returns true when the runtime SDK should be active for this build.
 */
export function isSentryRuntimeEnabled(env: Partial<SentryBuildEnv>): boolean {
  return Boolean(readNonEmptyString(env.VITE_SENTRY_DSN));
}

/**
 * Returns true when the build has enough credentials to upload sourcemaps.
 */
export function isSentrySourcemapUploadEnabled(env: Partial<SentryBuildEnv>): boolean {
  return (
    isSentryRuntimeEnabled(env) &&
    Boolean(readNonEmptyString(env.SENTRY_AUTH_TOKEN)) &&
    Boolean(readNonEmptyString(env.SENTRY_ORG)) &&
    Boolean(readNonEmptyString(env.SENTRY_PROJECT)) &&
    Boolean(readNonEmptyString(env.VITE_SENTRY_RELEASE))
  );
}

/**
 * Returns the sourcemap mode for the main Vite build.
 */
export function getSentryBuildSourcemapMode(env: Partial<SentryBuildEnv>): false | "hidden" {
  return isSentrySourcemapUploadEnabled(env) ? "hidden" : false;
}

/**
 * Creates the Sentry Vite plugin only when upload credentials are present.
 */
export function createSentryVitePlugin(env: Partial<SentryBuildEnv>): PluginOption | null {
  if (!isSentrySourcemapUploadEnabled(env)) {
    return null;
  }

  const authToken = readNonEmptyString(env.SENTRY_AUTH_TOKEN);
  const org = readNonEmptyString(env.SENTRY_ORG);
  const project = readNonEmptyString(env.SENTRY_PROJECT);
  const release = readNonEmptyString(env.VITE_SENTRY_RELEASE);

  if (!authToken || !org || !project || !release) {
    return null;
  }

  return sentryVitePlugin({
    authToken,
    org,
    project,
    telemetry: false,
    errorHandler(error) {
      console.warn(`[sentry-vite-plugin] ${error.message}`);
    },
    release: {
      name: release,
      inject: false,
      setCommits: false
    },
    bundleSizeOptimizations: {
      excludeReplayIframe: true,
      excludeReplayShadowDom: true,
      excludeReplayWorker: true,
      excludeTracing: true
    }
  });
}

function readNonEmptyString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
