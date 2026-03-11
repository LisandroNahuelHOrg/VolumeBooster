import type { LevelWarning } from "../../../../shared/types";

export function pickHighestWarning(current: LevelWarning, next: LevelWarning): LevelWarning {
  if (current === "danger" || next === "danger") {
    return "danger";
  }

  if (current === "high" || next === "high") {
    return "high";
  }

  return "none";
}
