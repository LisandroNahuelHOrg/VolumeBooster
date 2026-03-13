import {
  createDefaultMetrics,
  isProtectionBypassedSettings
} from "../../shared/audio-settings";
import { createLoudnessEstimatorState } from "../../shared/audio-settings/internal/create-loudness-estimator-state";
import type { AdvancedAudioSettings } from "../../shared/types";
import type { MediaElementSession } from "./media-element-session-contract";
import type { MediaElementSessionState } from "./media-element-session-state";
import { applyMediaElementSessionRuntimeParameters } from "./apply-media-element-session-runtime-parameters";
import { assertMediaAutoplayReady } from "./assert-media-autoplay-ready";
import { buildMediaElementSessionGraph } from "./build-media-element-session-graph";
import { createAudioContextOrThrow } from "./create-audio-context-or-throw";
import { createMediaElementSessionInstance } from "./create-media-element-session-instance";
import { createMediaSourceNodeOrThrow } from "./create-media-source-node-or-throw";
import { resumeAudioContextOrThrow } from "./resume-audio-context-or-throw";
import { setMediaElementSessionProcessingEnabled } from "./set-media-element-session-processing-enabled";

export async function createMediaElementSession(
  mediaElement: HTMLMediaElement,
  gainPercent: number,
  advancedAudioSettings: AdvancedAudioSettings
): Promise<MediaElementSession> {
  const mediaAutoplayPolicy = assertMediaAutoplayReady(mediaElement);
  const audioContext = createAudioContextOrThrow(mediaAutoplayPolicy);
  const audioContextAutoplayPolicy = await resumeAudioContextOrThrow(audioContext);
  const sourceNode = await createMediaSourceNodeOrThrow(audioContext, mediaElement, audioContextAutoplayPolicy);
  const graph = await buildMediaElementSessionGraph(audioContext, sourceNode);
  const state: MediaElementSessionState = {
    ...graph,
    mediaElement,
    currentGainPercent: gainPercent,
    currentSettings: advancedAudioSettings,
    latestMetrics: createDefaultMetrics(isProtectionBypassedSettings(advancedAudioSettings)),
    normalizationLoudnessState: createLoudnessEstimatorState(audioContext.sampleRate),
    processingEnabled: true
  };

  applyMediaElementSessionRuntimeParameters(state);
  setMediaElementSessionProcessingEnabled(state, true);
  return createMediaElementSessionInstance(state);
}
