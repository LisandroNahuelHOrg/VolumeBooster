export function hasAttachablePlayback(mediaElement: HTMLMediaElement): boolean {
  return (
    !mediaElement.ended &&
    !mediaElement.paused &&
    Boolean(mediaElement.currentSrc || mediaElement.srcObject) &&
    mediaElement.readyState >= (typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_METADATA : 1)
  );
}
