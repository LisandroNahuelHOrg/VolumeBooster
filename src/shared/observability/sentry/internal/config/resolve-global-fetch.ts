import type { FetchLike } from "../types";

export function resolveGlobalFetch(): FetchLike | undefined {
  if (typeof globalThis.fetch !== "function") {
    return undefined;
  }

  return globalThis.fetch.bind(globalThis) as FetchLike;
}
