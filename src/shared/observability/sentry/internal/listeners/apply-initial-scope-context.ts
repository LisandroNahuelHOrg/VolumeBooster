import type { Scope } from "@sentry/core";

import type { RuntimeContext } from "../../../../types";
import type { SentryRuntimeConfig } from "../types";
import { applyInitialScope } from "./apply-initial-scope";

export function applyInitialScopeContext(
  context: RuntimeContext,
  config: SentryRuntimeConfig,
  scope: Scope
): Scope {
  applyInitialScope(context, config, scope);
  return scope;
}
