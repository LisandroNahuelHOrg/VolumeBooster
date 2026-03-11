import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { MediaElementSession } from "../../media-element-session";
import { createMediaElementSessionTestHarness } from "./create-media-element-session-test-harness";
import { FakeAudioContext } from "./fake-audio-context";
import { makeMediaElement } from "./make-media-element";

export function registerAutoplayAndCreationTests(): void {
  describe("MediaElementSession autoplay and creation", () => {
    beforeEach(() => {
      createMediaElementSessionTestHarness();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("defers AudioContext creation when autoplay policy disallows audible playback", async () => {
      vi.stubGlobal("navigator", {
        getAutoplayPolicy: vi.fn(() => "disallowed"),
        userActivation: { hasBeenActive: false, isActive: false }
      } as unknown as Navigator);

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "autoplay_blocked",
          debugState: { audioContextState: "none", autoplayPolicy: "disallowed" },
          technicalMessage: expect.stringContaining("requires user gesture")
        });
      expect(FakeAudioContext.instances).toHaveLength(0);
    });

    it("allows creation without a recent gesture when autoplay policy explicitly allows it", async () => {
      vi.stubGlobal("navigator", {
        getAutoplayPolicy: vi.fn((target?: string | BaseAudioContext | HTMLMediaElement) =>
          target === "audiocontext" ? "allowed" : "allowed-muted"
        ),
        userActivation: { hasBeenActive: false, isActive: false }
      } as unknown as Navigator);

      const session = await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      expect(session.getDebugState()).toEqual({ audioContextState: "running", autoplayPolicy: "allowed-muted" });
    });

    it("blocks creation without a recent gesture when autoplay policy is unavailable", async () => {
      vi.stubGlobal("navigator", { userActivation: { hasBeenActive: false, isActive: false } } as unknown as Navigator);

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "autoplay_blocked",
          debugState: { audioContextState: "none", autoplayPolicy: undefined }
        });
    });

    it("reports autoplay_blocked when AudioContext construction itself fails", async () => {
      vi.stubGlobal(
        "AudioContext",
        class ThrowingAudioContext {
          constructor() {
            throw new Error("construction denied");
          }
        } as unknown as typeof AudioContext
      );

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "autoplay_blocked",
          technicalMessage: "AudioContext was not allowed to start. construction denied",
          debugState: { audioContextState: "none", autoplayPolicy: "allowed" }
        });
    });

    it("reports autoplay_blocked when resume leaves the context suspended", async () => {
      FakeAudioContext.nextState = "suspended";
      FakeAudioContext.keepStateOnResume = true;

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "autoplay_blocked",
          technicalMessage: expect.stringContaining("suspended")
        });
      expect(FakeAudioContext.instances[0]?.close).toHaveBeenCalledTimes(1);
    });

    it("reports autoplay_blocked when the audio context autoplay policy is disallowed before resume", async () => {
      vi.stubGlobal("navigator", {
        getAutoplayPolicy: vi.fn((target?: string | BaseAudioContext | HTMLMediaElement) =>
          typeof target === "string" ? "allowed" : "disallowed"
        ),
        userActivation: { hasBeenActive: true, isActive: true }
      } as unknown as Navigator);

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "autoplay_blocked",
          technicalMessage: "AudioContext autoplay policy is disallowed (disallowed).",
          debugState: { audioContextState: "closed", autoplayPolicy: "disallowed" }
        });
    });

    it("reports autoplay_blocked when AudioContext.resume throws", async () => {
      FakeAudioContext.nextState = "suspended";
      FakeAudioContext.resumeError = new Error("resume denied");

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "autoplay_blocked",
          technicalMessage: "AudioContext.resume() failed: resume denied",
          debugState: { audioContextState: "closed", autoplayPolicy: "allowed" }
        });
    });

    it.each([
      [new Error("already connected"), "already connected"],
      ["already connected elsewhere", "MediaElementAudioSourceNode could not be created."]
    ])("maps source conflicts safely", async (sourceError, technicalMessage) => {
      FakeAudioContext.sourceError = sourceError;

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "source_conflict",
          technicalMessage
        });
    });
  });
}
