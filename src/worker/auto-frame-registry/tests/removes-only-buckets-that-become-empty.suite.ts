import { AutoFrameRegistry } from "../../auto-frame-registry";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

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
  registry.updateFrameState(
    makeAutoFrameRuntimeState({
      tabId: 90,
      title: "State only",
      frameId: 1,
      documentId: "state-only",
      isTopFrame: false,
      frameUrl: "https://example.com/frame",
      url: "https://example.com/frame",
      toastVisible: true
    })
  );

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
