import * as Sentry from "@sentry/browser";

import type { RuntimeContext } from "../../../../types";
import type { SentryScopeLike } from "../types";
import { applyScopeMetadata } from "./apply-scope-metadata";

export function captureExceptionWithScope(
  error: Error,
  context: RuntimeContext,
  extras: Record<string, unknown> | undefined,
  scope: SentryScopeLike
): void {
  applyScopeMetadata(scope, context, extras);
  Sentry.captureException(error);
}
