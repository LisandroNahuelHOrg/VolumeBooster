import { applyAutoAttachFailure } from "./auto/apply-auto-attach-failure";
import { applyAutoLevelUpdate } from "./auto/apply-auto-level-update";
import { applyAutoStatusUpdate } from "./auto/apply-auto-status-update";
import { resolveFrameTarget } from "./auto/resolve-frame-target";
import { createTestRuntime, makeAttachFailure, makeAutoStatus, makeLevelUpdate } from "./test-harness";

describe("worker/orchestrator frame events", () => {
  it("prefers sender frame identity over payload identity", () => {
    expect(
      resolveFrameTarget(
        { frameId: 3, documentId: "sender-doc" } as chrome.runtime.MessageSender,
        { frameId: 9, documentId: "payload-doc" }
      )
    ).toEqual({
      frameId: 3,
      documentId: "sender-doc"
    });
  });

  it("aggregates status and level updates into the auto session cache", () => {
    const { runtime } = createTestRuntime();

    applyAutoStatusUpdate(runtime, makeAutoStatus());
    applyAutoLevelUpdate(runtime, makeLevelUpdate());

    expect(runtime.autoSessions.get(7)).toMatchObject({
      streamState: "active",
      warning: "high",
      clipEvents: 2
    });
  });

  it("keeps global failures in observing mode for recoverable attach errors", () => {
    const { runtime } = createTestRuntime();

    applyAutoAttachFailure(runtime, makeAttachFailure());

    expect(runtime.autoTabStates.get(7)).toMatchObject({
      autoAttachState: "observing",
      autoAttachReason: "no_media"
    });
  });
});
