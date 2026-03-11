import type { SentrySmokeMirrorEntry, SentrySmokeMirrorGlobal } from "../types";

export function readSentrySmokeMirrorEntries(): ReadonlyArray<SentrySmokeMirrorEntry> {
  const globalScope = globalThis as typeof globalThis & SentrySmokeMirrorGlobal;
  return [...(globalScope.__SENTRY_SMOKE_TRANSPORT__ ?? [])];
}
