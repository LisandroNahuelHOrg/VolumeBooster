import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import {
  MediaElementSession,
  hasPotentialMediaForAutomaticAttach,
  shouldAttemptAutomaticMediaAttach
} from "../../media-element-session";
import { createMediaElementSessionTestHarness } from "./create-media-element-session-test-harness";
import { makeMediaElement } from "./make-media-element";

export function registerAttachEligibilityTests(): void {
  describe("MediaElementSession attach eligibility", () => {
    beforeEach(() => {
      createMediaElementSessionTestHarness();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("evaluates automatic attach eligibility across playback, gesture, and policy states", () => {
      const metadataReadyState = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_METADATA : 1;

      expect(hasPotentialMediaForAutomaticAttach(makeMediaElement({ readyState: metadataReadyState }))).toBe(true);
      expect(hasPotentialMediaForAutomaticAttach(makeMediaElement({ paused: true }))).toBe(false);
      expect(hasPotentialMediaForAutomaticAttach(makeMediaElement({ ended: true }))).toBe(false);
      expect(hasPotentialMediaForAutomaticAttach(makeMediaElement({ currentSrc: "", srcObject: null }))).toBe(false);
      expect(hasPotentialMediaForAutomaticAttach(makeMediaElement({ readyState: Math.max(0, metadataReadyState - 1) })))
        .toBe(false);
      expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(true);

      vi.stubGlobal("navigator", {
        getAutoplayPolicy: vi.fn(() => "allowed"),
        userActivation: { hasBeenActive: false, isActive: false }
      } as unknown as Navigator);
      expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(true);

      vi.stubGlobal("navigator", {
        getAutoplayPolicy: vi.fn(() => "disallowed"),
        userActivation: { hasBeenActive: false, isActive: false }
      } as unknown as Navigator);
      expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(false);

      vi.stubGlobal("navigator", { userActivation: { hasBeenActive: false, isActive: false } } as unknown as Navigator);
      expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(false);
      expect(shouldAttemptAutomaticMediaAttach(makeMediaElement({ paused: true }))).toBe(false);
    });

    it("returns an undefined autoplay hint when policy api throws for both context and string lookups", async () => {
      const policySpy = vi.fn(() => {
        throw new Error("policy unavailable");
      });

      vi.stubGlobal("navigator", {
        getAutoplayPolicy: policySpy,
        userActivation: { hasBeenActive: true, isActive: true }
      } as unknown as Navigator);

      const session = await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      expect(session.getDebugState()).toEqual({ audioContextState: "running", autoplayPolicy: undefined });
      expect(policySpy).toHaveBeenCalledWith("audiocontext");
    });
  });
}
