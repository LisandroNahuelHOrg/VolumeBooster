import type { BrowserOptions } from "@sentry/browser";

import { scrubSentryEvent } from "./scrub-sentry-event";

export function beforeSendSentryEvent(
  event: Parameters<NonNullable<BrowserOptions["beforeSend"]>>[0],
  _hint: Parameters<NonNullable<BrowserOptions["beforeSend"]>>[1]
): ReturnType<NonNullable<BrowserOptions["beforeSend"]>> {
  return scrubSentryEvent(event);
}
