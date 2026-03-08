/**
 * @fileoverview Frame-aware registry used by the worker to track automatic
 * booster runtimes across tabs, frames, and documents.
 */
import type { AutoFrameRuntimeState, AutoFrameTarget } from "../shared/types";

export interface KnownAutoFrame extends AutoFrameTarget {
  tabId: number;
  isTopFrame: boolean;
  frameUrl?: string;
  ready: boolean;
  toastVisible: boolean;
  toastDismissed: boolean;
}

/**
 * Maintains known frame instances plus their latest runtime state snapshots.
 */
export class AutoFrameRegistry {
  private readonly knownFramesByTab = new Map<number, Map<string, KnownAutoFrame>>();
  private readonly frameStatesByTab = new Map<number, Map<string, AutoFrameRuntimeState>>();

  upsertKnownFrame(frame: Omit<KnownAutoFrame, "toastVisible" | "toastDismissed">): KnownAutoFrame {
    const tabFrames = this.ensureKnownFrameBucket(frame.tabId);
    const key = this.makeFrameKey(frame);
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

  updateFrameState(state: AutoFrameRuntimeState): void {
    this.upsertKnownFrame({
      tabId: state.tabId,
      frameId: state.frameId,
      documentId: state.documentId,
      isTopFrame: state.isTopFrame,
      frameUrl: state.frameUrl,
      ready: state.ready
    });
    this.ensureFrameStateBucket(state.tabId).set(this.makeFrameKey(state), state);
  }

  getKnownFrames(tabId: number): KnownAutoFrame[] {
    return [...(this.knownFramesByTab.get(tabId)?.values() ?? [])];
  }

  getTopFrame(tabId: number): KnownAutoFrame | null {
    return this.getKnownFrames(tabId).find((frame) => frame.isTopFrame) ?? null;
  }

  getFrameStates(tabId: number): AutoFrameRuntimeState[] {
    return [...(this.frameStatesByTab.get(tabId)?.values() ?? [])];
  }

  getFrameState(tabId: number, target: AutoFrameTarget): AutoFrameRuntimeState | null {
    return this.frameStatesByTab.get(tabId)?.get(this.makeFrameKey(target)) ?? null;
  }

  removeFrame(tabId: number, target: AutoFrameTarget): void {
    this.knownFramesByTab.get(tabId)?.delete(this.makeFrameKey(target));
    this.frameStatesByTab.get(tabId)?.delete(this.makeFrameKey(target));
    this.pruneEmptyTabBuckets(tabId);
  }

  clearTab(tabId: number): void {
    this.knownFramesByTab.delete(tabId);
    this.frameStatesByTab.delete(tabId);
  }

  markToastVisible(tabId: number, target: AutoFrameTarget, visible: boolean): void {
    const key = this.makeFrameKey(target);
    const knownFrame = this.knownFramesByTab.get(tabId)?.get(key);

    if (knownFrame) {
      knownFrame.toastVisible = visible;
    }

    const frameState = this.frameStatesByTab.get(tabId)?.get(key);

    if (frameState) {
      frameState.toastVisible = visible;
    }
  }

  markToastDismissed(tabId: number, target: AutoFrameTarget, dismissed: boolean): void {
    const knownFrame = this.knownFramesByTab.get(tabId)?.get(this.makeFrameKey(target));

    if (knownFrame) {
      knownFrame.toastDismissed = dismissed;
    }
  }

  isToastDismissed(tabId: number, target: AutoFrameTarget): boolean {
    return this.knownFramesByTab.get(tabId)?.get(this.makeFrameKey(target))?.toastDismissed ?? false;
  }

  resetToastStateForTab(tabId: number): void {
    for (const frame of this.getKnownFrames(tabId)) {
      frame.toastVisible = false;
      frame.toastDismissed = false;
    }

    for (const frameState of this.getFrameStates(tabId)) {
      frameState.toastVisible = false;
    }
  }

  private ensureKnownFrameBucket(tabId: number): Map<string, KnownAutoFrame> {
    let bucket = this.knownFramesByTab.get(tabId);

    if (!bucket) {
      bucket = new Map<string, KnownAutoFrame>();
      this.knownFramesByTab.set(tabId, bucket);
    }

    return bucket;
  }

  private ensureFrameStateBucket(tabId: number): Map<string, AutoFrameRuntimeState> {
    let bucket = this.frameStatesByTab.get(tabId);

    if (!bucket) {
      bucket = new Map<string, AutoFrameRuntimeState>();
      this.frameStatesByTab.set(tabId, bucket);
    }

    return bucket;
  }

  private pruneEmptyTabBuckets(tabId: number): void {
    if ((this.knownFramesByTab.get(tabId)?.size ?? 0) === 0) {
      this.knownFramesByTab.delete(tabId);
    }

    if ((this.frameStatesByTab.get(tabId)?.size ?? 0) === 0) {
      this.frameStatesByTab.delete(tabId);
    }
  }

  private makeFrameKey(target: AutoFrameTarget): string {
    return `${target.frameId}:${target.documentId ?? ""}`;
  }
}
