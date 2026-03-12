import { AutoFrameRegistry } from "../../auto-frame-registry";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("keeps missing-tab operations silent and supports the empty document id key", () => {
  const registry = new AutoFrameRegistry();

  registry.removeFrame(123, { frameId: 9, documentId: "missing" });
  registry.markToastVisible(123, { frameId: 9, documentId: "missing" }, true);
  registry.markToastDismissed(123, { frameId: 9, documentId: "missing" }, true);

  registry.upsertKnownFrame({
    tabId: 124,
    frameId: 7,
    documentId: undefined,
    isTopFrame: false,
    frameUrl: "https://example.com/child",
    ready: false
  });
  registry.updateFrameState(
    makeAutoFrameRuntimeState({
      tabId: 124,
      title: "Child frame",
      frameId: 7,
      documentId: undefined,
      isTopFrame: false,
      frameUrl: "https://example.com/child",
      url: "https://example.com/child",
      ready: false,
      autoAttachState: "idle",
      autoAttachReason: undefined
    })
  );

  expect(registry.getKnownFrames(123)).toEqual([]);
  expect(registry.getFrameStates(123)).toEqual([]);
  expect(registry.getKnownFrames(124)[0]).toMatchObject({
    frameId: 7,
    documentId: undefined
  });
  expect(registry.getFrameState(124, { frameId: 7, documentId: undefined })).toMatchObject({
    frameId: 7,
    documentId: undefined
  });
});
