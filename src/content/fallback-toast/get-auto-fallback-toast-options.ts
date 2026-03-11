import type {
  AutoFallbackToastInternals,
  AutoFallbackToastOptions
} from "./auto-fallback-toast-internals";
import { autoFallbackToastOptionsRegistry } from "./auto-fallback-toast-options-registry";

export function getAutoFallbackToastOptions(toast: AutoFallbackToastInternals): AutoFallbackToastOptions {
  const options = autoFallbackToastOptionsRegistry.get(toast);

  if (!options) {
    throw new Error("Auto fallback toast options are not initialized.");
  }

  return options;
}
