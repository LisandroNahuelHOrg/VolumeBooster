import type { RuntimeContext } from "../../../../types";
import type { SentryScopeLike } from "../types";

export function applyScopeMetadata(
  scope: SentryScopeLike,
  context: RuntimeContext,
  extras?: Record<string, unknown>
): void {
  scope.setTag("runtime_context", context);

  if (extras && Object.keys(extras).length > 0) {
    scope.setExtras(extras);
  }
}
