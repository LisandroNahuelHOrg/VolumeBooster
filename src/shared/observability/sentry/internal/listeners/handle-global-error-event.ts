import type { RuntimeContext } from "../../../../types";
import { captureExceptionSafe } from "../capture/capture-exception-safe";

export function handleGlobalErrorEvent(context: RuntimeContext, event: unknown): void {
  const errorEvent = event as {
    colno?: number;
    error?: unknown;
    filename?: string;
    lineno?: number;
    message?: string;
  };

  const normalizedError =
    errorEvent.error ??
    (typeof errorEvent.message === "string" && errorEvent.message.trim().length > 0
      ? new Error(errorEvent.message)
      : undefined);

  if (!normalizedError) {
    return;
  }

  captureExceptionSafe(normalizedError, context, {
    colno: errorEvent.colno,
    filename: errorEvent.filename,
    lineno: errorEvent.lineno,
    mechanism: "global-error"
  });
}
