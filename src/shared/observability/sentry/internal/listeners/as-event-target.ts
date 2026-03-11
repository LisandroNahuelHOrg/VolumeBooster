import type { EventTargetLike } from "../types";

export function asEventTarget(value: unknown): EventTargetLike | undefined {
  if (value && typeof value === "object" && "addEventListener" in value) {
    return value as EventTargetLike;
  }

  return undefined;
}
