import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { ensureFrameStateBucket } from "./ensure-frame-state-bucket";
import { makeAutoFrameKey } from "./make-auto-frame-key";
import { upsertKnownFrame } from "./upsert-known-frame";

export function updateFrameState(
  state: AutoFrameRegistryState,
  nextState: AutoFrameRuntimeState
): void {
  upsertKnownFrame(state, {
    tabId: nextState.tabId,
    frameId: nextState.frameId,
    documentId: nextState.documentId,
    isTopFrame: nextState.isTopFrame,
    frameUrl: nextState.frameUrl,
    ready: nextState.ready
  });
  ensureFrameStateBucket(state, nextState.tabId).set(makeAutoFrameKey(nextState), nextState);
}
