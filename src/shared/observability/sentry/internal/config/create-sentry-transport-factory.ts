import { makeFetchTransport } from "@sentry/browser";

import type { RuntimeContext } from "../../../../types";
import type { SentryRuntimeEnv } from "../../public-types";
import { createSmokeMirroredFetch } from "../smoke-mirror/create-smoke-mirrored-fetch";
import { resolveGlobalFetch } from "./resolve-global-fetch";

export function createSentryTransportFactory(
  context: RuntimeContext,
  env: Partial<SentryRuntimeEnv>,
  options: Parameters<typeof makeFetchTransport>[0]
) {
  const nativeFetch = resolveGlobalFetch();

  if (!nativeFetch) {
    return makeFetchTransport(options);
  }

  return makeFetchTransport(options, createSmokeMirroredFetch(context, nativeFetch));
}
