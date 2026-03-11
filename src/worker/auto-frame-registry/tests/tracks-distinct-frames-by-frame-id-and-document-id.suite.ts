import { AutoFrameRegistry } from "../../auto-frame-registry";

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
  const documentIds: Array<string | undefined> = [];

  for (const frame of knownFrames) {
    documentIds.push(frame.documentId);
  }

  documentIds.sort();
  expect(knownFrames).toHaveLength(2);
  expect(documentIds).toEqual(["doc-a", "doc-b"]);
});
