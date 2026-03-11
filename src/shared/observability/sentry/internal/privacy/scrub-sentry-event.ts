import type { SentryEventLike } from "../types";
import { sanitizeStructuredData } from "./sanitize-structured-data";

export function scrubSentryEvent<TEvent extends SentryEventLike>(event: TEvent): TEvent {
  const scrubbed = sanitizeStructuredData(event) as TEvent & {
    request?: unknown;
    user?: unknown;
  };

  if ("user" in scrubbed) {
    delete scrubbed.user;
  }

  if ("request" in scrubbed) {
    delete scrubbed.request;
  }

  return scrubbed;
}
