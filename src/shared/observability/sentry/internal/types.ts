import type { RuntimeContext } from "../../../types";
import type { SentryMessageLevel } from "../public-types";

export interface SentryRuntimeConfig {
  dsn?: string;
  enabled: boolean;
  environment: string;
  extensionVersion?: string;
  release?: string;
}

export type ChromeRuntimeLike = Pick<typeof chrome.runtime, "getManifest">;
export type EventTargetLike = Pick<EventTarget, "addEventListener">;
export type SentryScopeLike = {
  setExtras(extras: Record<string, unknown>): void;
  setLevel(level: SentryMessageLevel): void;
  setTag(key: string, value: string): void;
};
export type SentryEventLike = object;
export type FetchLike = typeof globalThis.fetch;

export interface SentrySmokeMirrorEntry {
  body?: string;
  context: RuntimeContext;
  statusCode?: number;
  timestamp: number;
  url: string;
}

export interface SentrySmokeMirrorGlobal {
  __SENTRY_SMOKE_TRANSPORT__?: SentrySmokeMirrorEntry[];
}
