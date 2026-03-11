import type {
  AutoFallbackToastInternals,
  AutoFallbackToastOptions
} from "./auto-fallback-toast-internals";

export const autoFallbackToastOptionsRegistry = new WeakMap<AutoFallbackToastInternals, AutoFallbackToastOptions>();
