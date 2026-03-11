import type { LocalizedMessage, RuntimeResponse } from "../types";

export function failRuntimeResponse<T>(errorMessage: LocalizedMessage): RuntimeResponse<T> {
  return { ok: false, errorMessage };
}
