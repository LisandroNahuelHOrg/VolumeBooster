import type { RuntimeResponse } from "../types";
import { createLocalizedMessage } from "./create-localized-message";
import { failRuntimeResponse } from "./fail-runtime-response";

export function normalizeRuntimeResponse<T>(response: RuntimeResponse<T> | undefined | null): RuntimeResponse<T> {
  if (response && typeof response === "object" && typeof response.ok === "boolean") {
    return response;
  }

  return failRuntimeResponse(createLocalizedMessage("errorRuntimeNoResponse"));
}
