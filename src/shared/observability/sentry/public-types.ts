export type SentryMessageLevel = "error" | "warning" | "info";

export interface SentryRuntimeEnv {
  DEV?: boolean;
  MODE?: string;
  PROD?: boolean;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  VITE_SENTRY_RELEASE?: string;
  VITE_SENTRY_SMOKE_MIRROR?: string;
}
