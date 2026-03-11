import type { AutoFallbackToastInternals } from "./auto-fallback-toast-internals";

export function isFallbackToastVisible(toast: AutoFallbackToastInternals): boolean {
  return Boolean(toast.root && !toast.root.hidden);
}
