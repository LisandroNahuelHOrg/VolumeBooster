import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("treats a single hybrid attachment as hybrid and ignores inactive failure telemetry", () => {
  const aggregation = aggregateAutoFrameStates(
    13,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "hybrid", streamState: "active", level: 0.24, warning: "high", protectorActionDb: 1.11, clipEvents: 1, clipPeak: 0.22, outputPeak: 0.33 }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", autoActiveStrategy: "web_audio_bridge", streamState: "inactive", level: 0.99, warning: "danger", protectorActionDb: 9.99, clipEvents: 99, clipPeak: 0.99, outputPeak: 0.99, protectionBypassed: true, lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 333
  );

  expect(aggregation).toMatchObject({
    tabState: { autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "hybrid" },
    session: { autoActiveStrategy: "hybrid", streamState: "active", engineStatus: "ready", level: 0.24, warning: "high", protectorActionDb: 1.11, clipEvents: 1, clipPeak: 0.22, outputPeak: 0.33, protectionBypassed: false, updatedAt: 333 }
  });
});
