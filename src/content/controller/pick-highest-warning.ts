import type { LevelWarning } from "../../shared/types";

export function pickHighestWarning(values: LevelWarning[]): LevelWarning {
  if (values.includes("danger")) {
    return "danger";
  }

  if (values.includes("high")) {
    return "high";
  }

  return "none";
}
