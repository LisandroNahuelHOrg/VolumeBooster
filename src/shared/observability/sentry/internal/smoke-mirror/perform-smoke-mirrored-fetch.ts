import type { RuntimeContext } from "../../../../types";
import type { FetchLike } from "../types";
import { extractFetchRequestUrl } from "./extract-fetch-request-url";
import { recordSentrySmokeMirrorEntry } from "./record-sentry-smoke-mirror-entry";
import { serializeFetchBody } from "./serialize-fetch-body";

export async function performSmokeMirroredFetch(
  context: RuntimeContext,
  nativeFetch: FetchLike,
  input: Parameters<FetchLike>[0],
  init?: Parameters<FetchLike>[1]
): Promise<Response> {
  const url = extractFetchRequestUrl(input);
  const body = serializeFetchBody(init?.body);

  try {
    const response = await nativeFetch(input, init);
    recordSentrySmokeMirrorEntry({
      body,
      context,
      statusCode: response.status,
      timestamp: Date.now(),
      url
    });
    return response;
  } catch (error) {
    recordSentrySmokeMirrorEntry({
      body,
      context,
      timestamp: Date.now(),
      url
    });
    throw error;
  }
}
