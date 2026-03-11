import { SENTRY_SMOKE_MIRROR_LIMIT } from "../constants";
import type { SentrySmokeMirrorEntry, SentrySmokeMirrorGlobal } from "../types";

export function recordSentrySmokeMirrorEntry(entry: SentrySmokeMirrorEntry): void {
  const globalScope = globalThis as typeof globalThis & SentrySmokeMirrorGlobal;
  const currentEntries = globalScope.__SENTRY_SMOKE_TRANSPORT__ ?? [];
  const nextEntries =
    currentEntries.length < SENTRY_SMOKE_MIRROR_LIMIT
      ? [...currentEntries]
      : currentEntries.slice(currentEntries.length - SENTRY_SMOKE_MIRROR_LIMIT + 1);

  nextEntries.push(entry);
  globalScope.__SENTRY_SMOKE_TRANSPORT__ = nextEntries;
}
