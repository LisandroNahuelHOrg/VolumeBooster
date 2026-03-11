import { AutoFrameRegistry } from "../../auto-frame-registry";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("keeps tab buckets alive while other frames in the tab still exist", () => {
  const registry = new AutoFrameRegistry();

  registry.updateFrameState(
    makeAutoFrameRuntimeState({
      tabId: 88,
      title: "Top frame",
      documentId: "doc-top",
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoActiveStrategy: "media_element",
      streamState: "active",
      level: 0.5,
      outputPeak: 0.4
    })
  );
  registry.updateFrameState(
    makeAutoFrameRuntimeState({
      tabId: 88,
      title: "Child frame",
      frameId: 3,
      documentId: "doc-child",
      isTopFrame: false,
      frameUrl: "https://example.com/frame",
      url: "https://example.com/frame"
    })
  );

  registry.removeFrame(88, { frameId: 3, documentId: "doc-child" });

  expect(registry.getKnownFrames(88)).toHaveLength(1);
  expect(registry.getFrameStates(88)).toHaveLength(1);
  expect(registry.getTopFrame(88)).toMatchObject({
    frameId: 0,
    documentId: "doc-top"
  });
});
