import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import type { KnownAutoFrame, UpsertKnownFrameInput } from "./known-auto-frame";
import { ensureKnownFrameBucket } from "./ensure-known-frame-bucket";
import { makeAutoFrameKey } from "./make-auto-frame-key";

export function upsertKnownFrame(
  state: AutoFrameRegistryState,
  frame: UpsertKnownFrameInput
): KnownAutoFrame {
  const tabFrames = ensureKnownFrameBucket(state, frame.tabId);
  const key = makeAutoFrameKey(frame);
  const existing = tabFrames.get(key);
  const nextFrame: KnownAutoFrame = {
    ...existing,
    ...frame,
    toastVisible: existing?.toastVisible ?? false,
    toastDismissed: existing?.toastDismissed ?? false
  };

  tabFrames.set(key, nextFrame);
  return nextFrame;
}
