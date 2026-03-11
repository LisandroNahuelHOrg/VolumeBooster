import * as Sentry from "@sentry/browser";

import type { RuntimeContext } from "../../../../types";
import type { SentryMessageLevel } from "../../public-types";
import type { SentryScopeLike } from "../types";
import { applyScopeMetadata } from "./apply-scope-metadata";

export function captureMessageWithScope(
  message: string,
  level: SentryMessageLevel,
  context: RuntimeContext,
  extras: Record<string, unknown> | undefined,
  scope: SentryScopeLike
): void {
  scope.setLevel(level);
  applyScopeMetadata(scope, context, extras);
  Sentry.captureMessage(message);
}
