import type {
  AudioSessionFactory,
  OffscreenSessionManagerRuntime,
  SessionMap
} from "./session-manager-contract";

export const createSessionManagerRuntime = (
  now: () => number,
  createAudioSession: AudioSessionFactory
): OffscreenSessionManagerRuntime => {
  const sessions: SessionMap = new Map();

  return {
    sessions,
    now,
    createAudioSession
  };
};
