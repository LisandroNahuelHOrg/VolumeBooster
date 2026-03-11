import type { FetchLike } from "../types";

export function extractFetchRequestUrl(input: Parameters<FetchLike>[0]): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}
