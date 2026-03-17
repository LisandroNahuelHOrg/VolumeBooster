import { AudioSession } from "../../audio-session";
import type { AudioSessionFactory } from "./session-manager-contract";

export const createDefaultAudioSession: AudioSessionFactory = (
  gainPercent,
  advancedAudioSettings,
  callbacks
) => new AudioSession(gainPercent, advancedAudioSettings, callbacks);
