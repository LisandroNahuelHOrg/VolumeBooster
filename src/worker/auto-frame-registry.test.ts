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
});
