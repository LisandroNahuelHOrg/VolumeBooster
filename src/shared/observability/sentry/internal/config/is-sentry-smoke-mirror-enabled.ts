import type { SentryRuntimeEnv } from "../../public-types";
import { readBooleanFlag } from "./read-boolean-flag";

export function isSentrySmokeMirrorEnabled(env: Partial<SentryRuntimeEnv>): boolean {
  return readBooleanFlag(env.VITE_SENTRY_SMOKE_MIRROR);
}
