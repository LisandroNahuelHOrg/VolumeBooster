import * as Sentry from "@sentry/browser";

import type { RuntimeContext } from "../../../../types";
import type { SentryMessageLevel } from "../../public-types";
import { sanitizeStructuredData } from "../privacy/sanitize-structured-data";
import { sentryRuntimeState } from "../runtime-state";
import { captureMessageWithScope } from "./capture-message-with-scope";

export function captureMessageSafe(
  message: string,
  level: SentryMessageLevel,
  context: RuntimeContext,
  extras?: Record<string, unknown>
): void {
  if (!sentryRuntimeState.runtimeEnabled) {
    return;
  }

  const sanitizedExtras = sanitizeStructuredData(extras) as Record<string, unknown> | undefined;

  try {
    Sentry.withScope(captureMessageWithScope.bind(undefined, message, level, context, sanitizedExtras));
  } catch {
    return;
  }
}
