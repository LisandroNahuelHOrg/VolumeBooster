import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers the bridge strategy when only bridge frames are attached and preserves debug counts", () => {
  const aggregation = aggregateAutoFrameStates(
    9,
    [
      makeAutoFrameRuntimeState({ ready: false, toastVisible: true, autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "web_audio_bridge", streamState: "active", level: 0.51, warning: "high", protectorActionDb: 3.33, clipEvents: 4, clipPeak: 0.66, outputPeak: 0.48 }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "observing", autoAttachReason: "no_media" })
    ],
    () => 99
  );

  expect(aggregation).toMatchObject({
    tabState: { autoActiveStrategy: "web_audio_bridge", autoAttachState: "attached", autoAttachReason: undefined },
    session: { autoActiveStrategy: "web_audio_bridge", warning: "high", protectorActionDb: 3.33, clipEvents: 4, clipPeak: 0.66, outputPeak: 0.48 },
    debug: { frameCount: 2, readyFrameCount: 1, attachedFrameCount: 1, toastVisible: true }
  });
});
