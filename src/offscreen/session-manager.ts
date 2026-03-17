import { createDefaultAudioSession } from "./session-manager/internal/create-default-audio-session";
import { createSessionManagerRuntime } from "./session-manager/internal/create-session-manager-runtime";
import { getSessionSnapshot } from "./session-manager/internal/get-session-snapshot";
import { getCurrentTime } from "./session-manager/internal/get-current-time";
import { setAdvancedAudioSettings } from "./session-manager/internal/set-advanced-audio-settings";
import { setGain } from "./session-manager/internal/set-gain";
import {
  type AudioSessionFactory,
  type AudioSessionPort,
  type OffscreenSessionManager
} from "./session-manager/internal/session-manager-contract";
import { startSession } from "./session-manager/internal/start-session";
import { stopAll } from "./session-manager/internal/stop-all";
import { stopSession } from "./session-manager/internal/stop-session";
import { updateMetadata } from "./session-manager/internal/update-metadata";

export type {
  AudioSessionFactory,
  AudioSessionPort,
  OffscreenSessionManager
} from "./session-manager/internal/session-manager-contract";

export const createOffscreenSessionManager = (
  now = getCurrentTime,
  createAudioSession: AudioSessionFactory = createDefaultAudioSession
): OffscreenSessionManager => {
  const runtime = createSessionManagerRuntime(now, createAudioSession);

  return {
    startSession: startSession.bind(undefined, runtime),
    setGain: setGain.bind(undefined, runtime),
    setAdvancedAudioSettings: setAdvancedAudioSettings.bind(undefined, runtime),
    updateMetadata: updateMetadata.bind(undefined, runtime),
    stopSession: stopSession.bind(undefined, runtime),
    stopAll: stopAll.bind(undefined, runtime),
    getSnapshot: getSessionSnapshot.bind(undefined, runtime.sessions)
  };
};
