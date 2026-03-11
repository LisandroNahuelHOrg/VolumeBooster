import type { RuntimeContext } from "../../../../types";
import type { FetchLike } from "../types";
import { performSmokeMirroredFetch } from "./perform-smoke-mirrored-fetch";

export function createSmokeMirroredFetch(context: RuntimeContext, nativeFetch: FetchLike): FetchLike {
  return performSmokeMirroredFetch.bind(undefined, context, nativeFetch) as FetchLike;
}
