import * as Sentry from "@sentry/browser";

import type { RuntimeContext } from "../../../../types";
import { sentryRuntimeState } from "../runtime-state";
import { sanitizeStructuredData } from "../privacy/sanitize-structured-data";
import { captureExceptionWithScope } from "./capture-exception-with-scope";
import { normalizeUnknownError } from "./normalize-unknown-error";

export function captureExceptionSafe(
  error: unknown,
  context: RuntimeContext,
  extras?: Record<string, unknown>
): void {
  if (!sentryRuntimeState.runtimeEnabled) {
    return;
  }

  const normalizedError = normalizeUnknownError(error);
  const sanitizedExtras = sanitizeStructuredData(extras) as Record<string, unknown> | undefined;

  try {
    Sentry.withScope(captureExceptionWithScope.bind(undefined, normalizedError, context, sanitizedExtras));
  } catch {
    return;
  }
}
