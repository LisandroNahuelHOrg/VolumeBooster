import { readNonEmptyString } from "./read-non-empty-string";

export function readBooleanFlag(value: string | undefined): boolean {
  const normalized = readNonEmptyString(value)?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
