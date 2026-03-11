import type { AutoFallbackToastCommandPayload } from "../../shared/types";
import type { AutoFallbackToastInternals } from "./auto-fallback-toast-internals";
import { ensureFallbackToastRoot } from "./ensure-fallback-toast-root";
import { resolveFallbackToastBodyCopy } from "./resolve-fallback-toast-body-copy";

export function showFallbackToast(
  toast: AutoFallbackToastInternals,
  payload: AutoFallbackToastCommandPayload
): void {
  if (window.top !== window.self) {
    return;
  }

  const root = ensureFallbackToastRoot(toast);
  const body = toast.body ?? root.querySelector<HTMLParagraphElement>("[data-role='body']");

  if (!body) {
    return;
  }

  toast.body = body;
  body.textContent = resolveFallbackToastBodyCopy(payload.reason, payload.errorMessage);
  root.hidden = false;
  root.dataset.mode = payload.errorMessage ? "error" : "prompt";
}
