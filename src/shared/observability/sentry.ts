/**
 * @fileoverview Shared Sentry runtime helpers for MV3 extension contexts.
 * Phase 1 instruments popup, offscreen, automation, and background only.
 */
import * as Sentry from "@sentry/browser";
import { makeFetchTransport } from "@sentry/browser";

import type { RuntimeContext } from "../types";

export type SentryMessageLevel = "error" | "warning" | "info";

export interface SentryRuntimeEnv {
  DEV?: boolean;
  MODE?: string;
  PROD?: boolean;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  VITE_SENTRY_RELEASE?: string;
  VITE_SENTRY_SMOKE_MIRROR?: string;
}

interface SentryRuntimeConfig {
  dsn?: string;
  enabled: boolean;
  environment: string;
  extensionVersion?: string;
  release?: string;
}

type ChromeRuntimeLike = Pick<typeof chrome.runtime, "getManifest">;
type EventTargetLike = Pick<EventTarget, "addEventListener">;
type SentryScopeLike = {
  setExtras(extras: Record<string, unknown>): void;
  setLevel(level: SentryMessageLevel): void;
  setTag(key: string, value: string): void;
};
type SentryEventLike = Record<string, unknown>;
type FetchLike = typeof globalThis.fetch;

interface SentrySmokeMirrorEntry {
  body?: string;
  context: RuntimeContext;
  statusCode?: number;
  timestamp: number;
  url: string;
}

interface SentrySmokeMirrorGlobal {
  __SENTRY_SMOKE_TRANSPORT__?: SentrySmokeMirrorEntry[];
}

const REDACTED_VALUE = "[redacted]";
const SENTRY_SMOKE_MIRROR_LIMIT = 10;
const DISABLED_SENTRY_INTEGRATION_NAMES = new Set([
  "Breadcrumbs",
  "BrowserApiErrors",
  "BrowserSession",
  "ConversationId",
  "CultureContext",
  "GlobalHandlers",
  "HttpContext"
]);
const SENSITIVE_FIELD_NAMES = new Set(["taburl", "tabtitle", "faviconurl"]);
const URL_FIELD_NAMES = new Set([
  "documenturl",
  "frameurl",
  "href",
  "pageurl",
  "requesturl",
  "url"
]);
const DROPPED_FIELD_NAMES = new Set(["request", "user"]);

let sentrySdkInitialized = false;
let sentryRuntimeEnabled = false;
const initializedContexts = new Set<RuntimeContext>();
const boundGlobalListenerContexts = new Set<RuntimeContext>();

/**
 * Filters the browser SDK defaults down to the integrations that fit phase 1.
 * This keeps the runtime on the well-supported default path while removing
 * extra telemetry that is outside the agreed scope.
 */
export function filterSentryIntegrations<TIntegration extends { name?: string }>(
  integrations: TIntegration[]
): TIntegration[] {
  return integrations.filter(
    (integration) => !DISABLED_SENTRY_INTEGRATION_NAMES.has(integration.name ?? "")
  );
}

/**
 * Initializes Sentry once for the current runtime context when a DSN is available.
 */
export function initSentryForContext(
  context: RuntimeContext,
  env: Partial<SentryRuntimeEnv> = import.meta.env,
  runtime: ChromeRuntimeLike | undefined = globalThis.chrome?.runtime,
  globalEventTarget: EventTargetLike | undefined = asEventTarget(globalThis)
): void {
  if (initializedContexts.has(context)) {
    return;
  }

  const config = resolveSentryRuntimeConfig(env, runtime);

  if (!config.enabled) {
    initializedContexts.add(context);
    return;
  }

  if (sentrySdkInitialized) {
    sentryRuntimeEnabled = true;
    bindGlobalErrorListeners(context, globalEventTarget);
    initializedContexts.add(context);
    return;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      enabled: true,
      environment: config.environment,
      release: config.release,
      sendDefaultPii: false,
      skipBrowserExtensionCheck: true,
      transport: isSentrySmokeMirrorEnabled(env)
        ? (options) => {
            const nativeFetch = resolveGlobalFetch();

            if (!nativeFetch) {
              return makeFetchTransport(options);
            }

            return makeFetchTransport(options, createSmokeMirroredFetch(context, nativeFetch));
          }
        : undefined,
      integrations(defaultIntegrations) {
        return filterSentryIntegrations(defaultIntegrations);
      },
      beforeSend(event) {
        return scrubSentryEvent(event as unknown as SentryEventLike) as unknown as typeof event;
      },
      initialScope(scope) {
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
    });

    sentryRuntimeEnabled = true;
    sentrySdkInitialized = true;
    bindGlobalErrorListeners(context, globalEventTarget);
    initializedContexts.add(context);
  } catch {
    sentryRuntimeEnabled = false;
  }
}

/**
 * Captures an exception if Sentry is enabled, without throwing if the payload is malformed.
 */
export function captureExceptionSafe(
  error: unknown,
  context: RuntimeContext,
  extras?: Record<string, unknown>
): void {
  if (!sentryRuntimeEnabled) {
    return;
  }

  const normalizedError = normalizeUnknownError(error);
  const sanitizedExtras = sanitizeStructuredData(extras) as Record<string, unknown> | undefined;

  try {
    Sentry.withScope((scope) => {
      applyScopeMetadata(scope, context, sanitizedExtras);
      Sentry.captureException(normalizedError);
    });
  } catch {
    return;
  }
}

/**
 * Captures a message if Sentry is enabled, without throwing if capture fails.
 */
export function captureMessageSafe(
  message: string,
  level: SentryMessageLevel,
  context: RuntimeContext,
  extras?: Record<string, unknown>
): void {
  if (!sentryRuntimeEnabled) {
    return;
  }

  const sanitizedExtras = sanitizeStructuredData(extras) as Record<string, unknown> | undefined;

  try {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      applyScopeMetadata(scope, context, sanitizedExtras);
      Sentry.captureMessage(message);
    });
  } catch {
    return;
  }
}

/**
 * Exposed for tests to validate the privacy scrubber behavior.
 */
export function scrubSentryEvent<TEvent extends Record<string, unknown>>(event: TEvent): TEvent {
  const scrubbed = sanitizeStructuredData(event) as TEvent;

  if ("user" in scrubbed) {
    delete scrubbed.user;
  }

  if ("request" in scrubbed) {
    delete scrubbed.request;
  }

  return scrubbed;
}

/**
 * Exposed for tests to reset the module-local Sentry runtime state.
 */
export function resetSentryStateForTests(): void {
  sentrySdkInitialized = false;
  sentryRuntimeEnabled = false;
  initializedContexts.clear();
  boundGlobalListenerContexts.clear();
  resetSentrySmokeMirrorForTests();
}

/**
 * Enables a deterministic transport mirror for smoke builds only.
 */
export function isSentrySmokeMirrorEnabled(env: Partial<SentryRuntimeEnv>): boolean {
  return readBooleanFlag(env.VITE_SENTRY_SMOKE_MIRROR);
}

/**
 * Exposed for smoke verification to inspect mirrored envelopes.
 */
export function readSentrySmokeMirrorEntries(): ReadonlyArray<SentrySmokeMirrorEntry> {
  return [...(((globalThis as typeof globalThis & SentrySmokeMirrorGlobal).__SENTRY_SMOKE_TRANSPORT__) ?? [])];
}

/**
 * Backwards-compatible alias kept for tests.
 */
export function readSentrySmokeMirrorForTests(): ReadonlyArray<SentrySmokeMirrorEntry> {
  return readSentrySmokeMirrorEntries();
}

/**
 * Exposed for tests to clear mirrored transport captures between runs.
 */
export function resetSentrySmokeMirrorForTests(): void {
  delete (globalThis as typeof globalThis & SentrySmokeMirrorGlobal).__SENTRY_SMOKE_TRANSPORT__;
}

/**
 * Resolves the runtime configuration from Vite env vars and the extension manifest.
 */
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

function applyScopeMetadata(scope: SentryScopeLike, context: RuntimeContext, extras?: Record<string, unknown>): void {
  scope.setTag("runtime_context", context);

  if (extras && Object.keys(extras).length > 0) {
    scope.setExtras(extras);
  }
}

function bindGlobalErrorListeners(
  context: RuntimeContext,
  globalEventTarget: EventTargetLike | undefined
): void {
  if (boundGlobalListenerContexts.has(context)) {
    return;
  }

  if (!globalEventTarget || typeof globalEventTarget.addEventListener !== "function") {
    return;
  }

  globalEventTarget.addEventListener("error", (event: unknown) => {
    const errorEvent = event as {
      colno?: number;
      error?: unknown;
      filename?: string;
      lineno?: number;
      message?: string;
    };
    const normalizedError =
      errorEvent.error ??
      (typeof errorEvent.message === "string" && errorEvent.message.trim().length > 0
        ? new Error(errorEvent.message)
        : undefined);

    if (!normalizedError) {
      return;
    }

    captureExceptionSafe(normalizedError, context, {
      colno: errorEvent.colno,
      filename: errorEvent.filename,
      lineno: errorEvent.lineno,
      mechanism: "global-error"
    });
  });

  globalEventTarget.addEventListener("unhandledrejection", (event: unknown) => {
    const rejectionEvent = event as { reason?: unknown };
    captureExceptionSafe(rejectionEvent.reason, context, {
      mechanism: "unhandledrejection"
    });
  });

  boundGlobalListenerContexts.add(context);
}

export function createSmokeMirroredFetch(context: RuntimeContext, nativeFetch: FetchLike): FetchLike {
  return async (input, init) => {
    const url = extractFetchRequestUrl(input);
    const body = serializeFetchBody(init?.body);

    try {
      const response = await nativeFetch(input, init);
      recordSentrySmokeMirrorEntry({
        body,
        context,
        statusCode: response.status,
        timestamp: Date.now(),
        url
      });
      return response;
    } catch (error) {
      recordSentrySmokeMirrorEntry({
        body,
        context,
        timestamp: Date.now(),
        url
      });
      throw error;
    }
  };
}

function normalizeUnknownError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return new Error(error);
  }

  return new Error("Unknown runtime exception");
}

function recordSentrySmokeMirrorEntry(entry: SentrySmokeMirrorEntry): void {
  const globalScope = globalThis as typeof globalThis & SentrySmokeMirrorGlobal;
  const nextEntries = [...(globalScope.__SENTRY_SMOKE_TRANSPORT__ ?? []), entry];
  globalScope.__SENTRY_SMOKE_TRANSPORT__ = nextEntries.slice(-SENTRY_SMOKE_MIRROR_LIMIT);
}

function sanitizeStructuredData(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizedKey = key?.toLowerCase();

  if (normalizedKey && DROPPED_FIELD_NAMES.has(normalizedKey)) {
    return undefined;
  }

  if (normalizedKey && SENSITIVE_FIELD_NAMES.has(normalizedKey)) {
    return REDACTED_VALUE;
  }

  if (typeof value === "string") {
    if (normalizedKey && URL_FIELD_NAMES.has(normalizedKey)) {
      return stripQueryAndHash(value);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeStructuredData(entry))
      .filter((entry) => entry !== undefined);
  }

  if (isPlainObject(value)) {
    const nextRecord: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of Object.entries(value)) {
      const sanitizedValue = sanitizeStructuredData(entryValue, entryKey);

      if (sanitizedValue !== undefined) {
        nextRecord[entryKey] = sanitizedValue;
      }
    }

    return nextRecord;
  }

  return value;
}

function stripQueryAndHash(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    const hashIndex = value.indexOf("#");
    const searchIndex = value.indexOf("?");
    const cutIndex = [hashIndex, searchIndex].filter((index) => index >= 0).sort((left, right) => left - right)[0];

    return cutIndex === undefined ? value : value.slice(0, cutIndex);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asEventTarget(value: unknown): EventTargetLike | undefined {
  if (value && typeof value === "object" && "addEventListener" in value) {
    return value as EventTargetLike;
  }

  return undefined;
}

function resolveGlobalFetch(): FetchLike | undefined {
  if (typeof globalThis.fetch !== "function") {
    return undefined;
  }

  return globalThis.fetch.bind(globalThis);
}

function extractFetchRequestUrl(input: Parameters<FetchLike>[0]): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function serializeFetchBody(body: RequestInit["body"]): string | undefined {
  if (typeof body === "string") {
    return body;
  }

  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  return undefined;
}

function readNonEmptyString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readBooleanFlag(value: string | undefined): boolean {
  const normalized = readNonEmptyString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
