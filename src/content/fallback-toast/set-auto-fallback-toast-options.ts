import type {
  AutoFallbackToastInternals,
  AutoFallbackToastOptions
} from "./auto-fallback-toast-internals";
import { autoFallbackToastOptionsRegistry } from "./auto-fallback-toast-options-registry";

export function setAutoFallbackToastOptions(
  toast: AutoFallbackToastInternals,
  options: AutoFallbackToastOptions
): void {
  autoFallbackToastOptionsRegistry.set(toast, options);
}
