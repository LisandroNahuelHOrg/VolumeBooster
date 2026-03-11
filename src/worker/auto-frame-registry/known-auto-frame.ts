import type { AutoFrameTarget } from "../../shared/types";

export interface KnownAutoFrame extends AutoFrameTarget {
  tabId: number;
  isTopFrame: boolean;
  frameUrl?: string;
  ready: boolean;
  toastVisible: boolean;
  toastDismissed: boolean;
}

export type UpsertKnownFrameInput = Omit<KnownAutoFrame, "toastVisible" | "toastDismissed">;
