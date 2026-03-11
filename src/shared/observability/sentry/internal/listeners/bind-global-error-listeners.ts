import type { RuntimeContext } from "../../../../types";
import type { EventTargetLike } from "../types";
import { sentryRuntimeState } from "../runtime-state";
import { handleGlobalErrorEvent } from "./handle-global-error-event";
import { handleUnhandledRejectionEvent } from "./handle-unhandled-rejection-event";

export function bindGlobalErrorListeners(
  context: RuntimeContext,
  globalEventTarget: EventTargetLike | undefined
): void {
  if (sentryRuntimeState.boundGlobalListenerContexts.has(context)) {
    return;
  }

  if (!globalEventTarget || typeof globalEventTarget.addEventListener !== "function") {
    return;
  }

  globalEventTarget.addEventListener("error", handleGlobalErrorEvent.bind(undefined, context));
  globalEventTarget.addEventListener(
    "unhandledrejection",
    handleUnhandledRejectionEvent.bind(undefined, context)
  );
  sentryRuntimeState.boundGlobalListenerContexts.add(context);
}
