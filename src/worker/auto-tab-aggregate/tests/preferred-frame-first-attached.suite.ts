import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("falls back to the first attached frame when no top frame exists", () => {
  const aggregation = aggregateAutoFrameStates(
    31,
    [
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, title: "Attached child", url: "https://child.example/attached", domain: "child.example", autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "media_element", streamState: "active" }),
      makeAutoFrameRuntimeState({ frameId: 2, isTopFrame: false, title: "Observer", url: "https://child.example/observe", domain: "child.example", autoAttachState: "observing", autoAttachReason: "no_media" })
    ],
    () => 77
  );

  expect(aggregation).toMatchObject({
    tabState: { title: "Attached child", url: "https://child.example/attached", domain: "child.example", autoActiveStrategy: "media_element", autoAttachState: "attached" },
    session: { updatedAt: 77, engineStatus: "ready", streamState: "active" }
  });
});
