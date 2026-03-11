import type { LocalizedMessage } from "../types";

export function isLocalizedMessage(value: unknown): value is LocalizedMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "key" in value &&
      typeof (value as { key: unknown }).key === "string"
  );
}
