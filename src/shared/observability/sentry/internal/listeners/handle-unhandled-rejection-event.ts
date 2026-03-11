import type { RuntimeContext } from "../../../../types";
import { captureExceptionSafe } from "../capture/capture-exception-safe";

export function handleUnhandledRejectionEvent(context: RuntimeContext, event: unknown): void {
  const rejectionEvent = event as { reason?: unknown };
  captureExceptionSafe(rejectionEvent.reason, context, {
    mechanism: "unhandledrejection"
  });
}
