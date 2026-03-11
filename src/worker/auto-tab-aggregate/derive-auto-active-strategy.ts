import type { AutoActiveStrategy, AutoFrameRuntimeState } from "../../shared/types";

export function deriveAutoActiveStrategy(attachedFrames: AutoFrameRuntimeState[]): AutoActiveStrategy {
  const mediaAttached = attachedFrames.some(
    (frame) => frame.autoActiveStrategy === "media_element" || frame.autoActiveStrategy === "hybrid"
  );
  const bridgeAttached = attachedFrames.some(
    (frame) => frame.autoActiveStrategy === "web_audio_bridge" || frame.autoActiveStrategy === "hybrid"
  );

  if (mediaAttached && bridgeAttached) {
    return "hybrid";
  }

  if (bridgeAttached) {
    return "web_audio_bridge";
  }

  if (mediaAttached) {
    return "media_element";
  }

  return "none";
}
