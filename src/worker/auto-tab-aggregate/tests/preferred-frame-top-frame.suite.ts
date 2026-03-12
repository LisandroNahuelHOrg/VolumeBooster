import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers the top frame metadata when present", () => {
  const aggregation = aggregateAutoFrameStates(
    30,
    [
      makeAutoFrameRuntimeState({ title: "Top frame", url: "https://top.example/watch", domain: "top.example", autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "media_element", streamState: "active" }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, title: "Child frame", url: "https://child.example/watch", domain: "child.example", autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "media_element", streamState: "active" })
    ],
    () => 1
  );

  expect(aggregation?.tabState).toMatchObject({ title: "Top frame", url: "https://top.example/watch", domain: "top.example" });
});
