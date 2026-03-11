import type { AutoFallbackToastInternals } from "./auto-fallback-toast-internals";

export function hideFallbackToast(toast: AutoFallbackToastInternals): void {
  if (toast.root) {
    toast.root.hidden = true;
  }
}
