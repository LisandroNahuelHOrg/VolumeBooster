import type { SentrySmokeMirrorGlobal } from "../types";

export function resetSentrySmokeMirrorForTests(): void {
  delete (globalThis as typeof globalThis & SentrySmokeMirrorGlobal).__SENTRY_SMOKE_TRANSPORT__;
}
