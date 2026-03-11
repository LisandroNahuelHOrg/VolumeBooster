import type { MediaElementSession } from "./media-element-session-contract";
import type { MediaElementSessionState } from "./media-element-session-state";
import { getMediaElementSessionDebugState } from "./get-media-element-session-debug-state";
import { isMediaElementSessionConnected } from "./is-media-element-session-connected";
import { resumeMediaElementSessionProcessing } from "./resume-media-element-session-processing";
import { sampleMediaElementSessionTelemetry } from "./sample-media-element-session-telemetry";
import { setMediaElementSessionAudioSettings } from "./set-media-element-session-audio-settings";
import { setMediaElementSessionGainPercent } from "./set-media-element-session-gain-percent";
import { setMediaElementSessionProcessingEnabled } from "./set-media-element-session-processing-enabled";
import { stopMediaElementSession } from "./stop-media-element-session";

export function createMediaElementSessionInstance(state: MediaElementSessionState): MediaElementSession {
  return {
    isConnectedTo: (element) => isMediaElementSessionConnected(state, element),
    setGainPercent: (gainPercent) => setMediaElementSessionGainPercent(state, gainPercent),
    setAdvancedAudioSettings: (settings) => setMediaElementSessionAudioSettings(state, settings),
    setProcessingEnabled: (enabled) => setMediaElementSessionProcessingEnabled(state, enabled),
    sampleTelemetry: () => sampleMediaElementSessionTelemetry(state),
    getDebugState: () => getMediaElementSessionDebugState(state),
    resumeProcessing: () => resumeMediaElementSessionProcessing(state),
    stop: () => stopMediaElementSession(state)
  };
}
