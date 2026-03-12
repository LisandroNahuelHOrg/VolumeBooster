import { deriveLiveActivityPercent } from "../../live-activity";

export function formatLevelPercent(level: number): string {
  return `${deriveLiveActivityPercent(level)}%`;
}
