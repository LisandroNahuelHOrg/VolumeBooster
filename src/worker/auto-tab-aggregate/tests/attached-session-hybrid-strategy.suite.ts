import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("combines media-element and bridge frames into a hybrid attached session", () => {
  const aggregation = aggregateAutoFrameStates(
    7,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "media_element", streamState: "active", level: 0.42, warning: "high", protectorActionDb: 4.1, clipEvents: 2, clipPeak: 0.6, outputPeak: 0.31 }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "web_audio_bridge", streamState: "active", level: 0.73, warning: "danger", protectorActionDb: 7.4, clipEvents: 5, clipPeak: 0.91, protectionBypassed: true, outputPeak: 0.58 })
    ],
    () => 123456
  );

  expect(aggregation).toMatchObject({
    tabState: { tabId: 7, autoAttachState: "attached", autoActiveStrategy: "hybrid" },
    session: { streamState: "active", autoActiveStrategy: "hybrid", level: 0.73, warning: "danger", protectorActionDb: 7.4, clipEvents: 7, clipPeak: 0.91, protectionBypassed: true, outputPeak: 0.58, updatedAt: 123456 },
    debug: { frameCount: 2, readyFrameCount: 2, attachedFrameCount: 2, toastVisible: false }
  });
});
