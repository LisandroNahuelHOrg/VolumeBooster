import type { AutoFrameTarget } from "../../shared/types";

export function makeAutoFrameKey(target: AutoFrameTarget): string {
  return `${target.frameId}:${target.documentId ?? ""}`;
}
