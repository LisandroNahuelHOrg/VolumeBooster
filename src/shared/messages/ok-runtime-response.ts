import type { RuntimeResponse } from "../types";

export function okRuntimeResponse<T>(data?: T): RuntimeResponse<T> {
  return { ok: true, data };
}
