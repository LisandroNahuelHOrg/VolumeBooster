import type { AutoFallbackToastInternals } from "./auto-fallback-toast-internals";

export function destroyFallbackToast(toast: AutoFallbackToastInternals): void {
  toast.root?.remove();
  toast.root = null;
  toast.body = null;
}
