import { AutoFrameRegistry } from "./auto-frame-registry";

describe("AutoFrameRegistry", () => {
  it("tracks distinct frames by frame id and document id", () => {
    const registry = new AutoFrameRegistry();

    registry.upsertKnownFrame({
      tabId: 7,
      frameId: 0,
      documentId: "doc-a",
      isTopFrame: true,
      frameUrl: "https://example.com",
      ready: true
    });
    registry.upsertKnownFrame({
      tabId: 7,
      frameId: 0,
      documentId: "doc-b",
      isTopFrame: true,
      frameUrl: "https://example.com/next",
      ready: true
    });

    const knownFrames = registry.getKnownFrames(7);

    expect(knownFrames).toHaveLength(2);
    expect(knownFrames.map((frame) => frame.documentId).sort()).toEqual(["doc-a", "doc-b"]);
  });

  it("persists toast visibility and dismissal state per frame target", () => {
    const registry = new AutoFrameRegistry();

    registry.upsertKnownFrame({
      tabId: 12,
      frameId: 0,
      documentId: "doc-a",
      isTopFrame: true,
      frameUrl: "https://example.com",
      ready: true
    });

    registry.markToastVisible(12, { frameId: 0, documentId: "doc-a" }, true);
    registry.markToastDismissed(12, { frameId: 0, documentId: "doc-a" }, true);

    expect(registry.getTopFrame(12)).toMatchObject({
      toastVisible: true,
      toastDismissed: true
    });
    expect(registry.isToastDismissed(12, { frameId: 0, documentId: "doc-a" })).toBe(true);

    registry.resetToastStateForTab(12);

    expect(registry.getTopFrame(12)).toMatchObject({
      toastVisible: false,
      toastDismissed: false
    });
  });

  it("tracks runtime state snapshots, prunes empty tabs, and tolerates missing frames", () => {
    const registry = new AutoFrameRegistry();

    expect(registry.getTopFrame(50)).toBeNull();
    expect(registry.getFrameState(50, { frameId: 0, documentId: "missing" })).toBeNull();
    expect(registry.getFrameStates(50)).toEqual([]);
    expect(registry.isToastDismissed(50, { frameId: 0, documentId: "missing" })).toBe(false);

    registry.updateFrameState({
      tabId: 50,
      frameId: 3,
      documentId: "doc-a",
      isTopFrame: false,
      frameUrl: "https://example.com/frame",
      ready: true,
      toastVisible: true,
      attachState: "observing",
      attachReason: "no_media",
      activeStrategy: "none",
      audioContextState: "none",
      audioContextCount: 0,
      attachedNodeCount: 0,
      currentUrl: "https://example.com/frame"
    });

    expect(registry.getKnownFrames(50)[0]).toMatchObject({
      frameId: 3,
      documentId: "doc-a",
      ready: true,
      toastVisible: false,
      toastDismissed: false
    });
    expect(registry.getFrameState(50, { frameId: 3, documentId: "doc-a" })).toMatchObject({
      tabId: 50,
      toastVisible: true
    });

    registry.markToastVisible(50, { frameId: 3, documentId: "doc-a" }, false);
    expect(registry.getFrameState(50, { frameId: 3, documentId: "doc-a" })?.toastVisible).toBe(false);

    registry.markToastVisible(50, { frameId: 99, documentId: "missing" }, true);
    registry.markToastDismissed(50, { frameId: 99, documentId: "missing" }, true);
    expect(registry.isToastDismissed(50, { frameId: 99, documentId: "missing" })).toBe(false);

    registry.removeFrame(50, { frameId: 3, documentId: "doc-a" });

    expect(registry.getKnownFrames(50)).toEqual([]);
    expect(registry.getFrameStates(50)).toEqual([]);

    registry.updateFrameState({
      tabId: 51,
      frameId: 0,
      documentId: "doc-top",
      isTopFrame: true,
      frameUrl: "https://example.com",
      ready: true,
      toastVisible: false,
      attachState: "attached",
      activeStrategy: "web_audio_bridge",
      audioContextState: "running",
      audioContextCount: 1,
      attachedNodeCount: 1,
      currentUrl: "https://example.com"
    });
    registry.clearTab(51);

    expect(registry.getKnownFrames(51)).toEqual([]);
    expect(registry.getFrameStates(51)).toEqual([]);
  });

  it("keeps tab buckets alive while other frames in the tab still exist", () => {
    const registry = new AutoFrameRegistry();

    registry.updateFrameState({
      tabId: 88,
      frameId: 0,
      documentId: "doc-top",
      isTopFrame: true,
      frameUrl: "https://example.com",
      ready: true,
      toastVisible: false,
      attachState: "attached",
      activeStrategy: "media_element",
      audioContextState: "running",
      audioContextCount: 1,
      attachedNodeCount: 1,
      currentUrl: "https://example.com"
    });
    registry.updateFrameState({
      tabId: 88,
      frameId: 3,
      documentId: "doc-child",
      isTopFrame: false,
      frameUrl: "https://example.com/frame",
      ready: true,
      toastVisible: false,
      attachState: "observing",
      attachReason: "no_media",
      activeStrategy: "none",
      audioContextState: "none",
      audioContextCount: 0,
      attachedNodeCount: 0,
      currentUrl: "https://example.com/frame"
    });

    registry.removeFrame(88, { frameId: 3, documentId: "doc-child" });

    expect(registry.getKnownFrames(88)).toHaveLength(1);
    expect(registry.getFrameStates(88)).toHaveLength(1);
    expect(registry.getTopFrame(88)).toMatchObject({
      frameId: 0,
      documentId: "doc-top"
    });
  });

  it("removes only the buckets that become empty and keeps sibling buckets intact", () => {
    const registry = new AutoFrameRegistry();

    registry.upsertKnownFrame({
      tabId: 90,
      frameId: 0,
      documentId: "known-only",
      isTopFrame: true,
      frameUrl: "https://example.com",
      ready: true
    });
    registry.updateFrameState({
      tabId: 90,
      frameId: 1,
      documentId: "state-only",
      isTopFrame: false,
      frameUrl: "https://example.com/frame",
      ready: true,
      toastVisible: true,
      attachState: "observing",
      attachReason: "no_media",
      activeStrategy: "none",
      audioContextState: "none",
      audioContextCount: 0,
      attachedNodeCount: 0,
      currentUrl: "https://example.com/frame"
    });

    registry.removeFrame(90, { frameId: 0, documentId: "known-only" });
    expect(registry.getKnownFrames(90)).toHaveLength(1);
    expect(registry.getKnownFrames(90)[0]).toMatchObject({
      frameId: 1,
      documentId: "state-only"
    });
    expect(registry.getFrameStates(90)).toHaveLength(1);

    registry.removeFrame(90, { frameId: 1, documentId: "state-only" });
    expect(registry.getKnownFrames(90)).toEqual([]);
    expect(registry.getFrameStates(90)).toEqual([]);
  });

  it("keeps missing-tab operations silent and includes the empty document id in frame keys", () => {
    const registry = new AutoFrameRegistry();

    expect(() => registry.removeFrame(123, { frameId: 9, documentId: "missing" })).not.toThrow();
    expect(() => registry.markToastVisible(123, { frameId: 9, documentId: "missing" }, true)).not.toThrow();
    expect(() => registry.markToastDismissed(123, { frameId: 9, documentId: "missing" }, true)).not.toThrow();

    registry.upsertKnownFrame({
      tabId: 124,
      frameId: 7,
      documentId: undefined,
      isTopFrame: false,
      frameUrl: "https://example.com/child",
      ready: false
    });
    registry.updateFrameState({
      tabId: 124,
      frameId: 7,
      documentId: undefined,
      isTopFrame: false,
      frameUrl: "https://example.com/child",
      ready: false,
      toastVisible: false,
      attachState: "idle",
      activeStrategy: "none",
      audioContextState: "none",
      audioContextCount: 0,
      attachedNodeCount: 0,
      currentUrl: "https://example.com/child"
    });

    expect(registry.getKnownFrames(124)[0]).toMatchObject({
      frameId: 7,
      documentId: undefined
    });
    expect(registry.getFrameState(124, { frameId: 7, documentId: undefined })).toMatchObject({
      frameId: 7,
      documentId: undefined
    });
  });
});
