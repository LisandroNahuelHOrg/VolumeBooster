import { AutoFrameRegistry } from "../../auto-frame-registry";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("tracks runtime state snapshots, prunes empty tabs, and tolerates missing frames", () => {
  const registry = new AutoFrameRegistry();

  expect(registry.getTopFrame(50)).toBeNull();
  expect(registry.getFrameState(50, { frameId: 0, documentId: "missing" })).toBeNull();
  expect(registry.getFrameStates(50)).toEqual([]);
  expect(registry.isToastDismissed(50, { frameId: 0, documentId: "missing" })).toBe(false);

  registry.updateFrameState(
    makeAutoFrameRuntimeState({
      tabId: 50,
      title: "Frame A",
      frameId: 3,
      documentId: "doc-a",
      isTopFrame: false,
      frameUrl: "https://example.com/frame",
      url: "https://example.com/frame",
      ready: true,
      toastVisible: true
    })
  );

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

  registry.updateFrameState(
    makeAutoFrameRuntimeState({
      tabId: 51,
      title: "Top frame",
      documentId: "doc-top",
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoActiveStrategy: "web_audio_bridge",
      streamState: "active",
      level: 0.4,
      warning: "high",
      protectorActionDb: 2,
      clipPeak: 0.2,
      outputPeak: 0.44
    })
  );
  registry.clearTab(51);

  expect(registry.getKnownFrames(51)).toEqual([]);
  expect(registry.getFrameStates(51)).toEqual([]);
});
