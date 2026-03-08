/**
 * @fileoverview Small helpers for frame-local runtime context.
 */

export interface CurrentFrameContext {
  isTopFrame: boolean;
  frameUrl: string;
}

/**
 * Returns the current content-script frame context in a side-effect-free way.
 */
export function getCurrentFrameContext(): CurrentFrameContext {
  const locationHref =
    window.location?.href ??
    (typeof document !== "undefined" ? document.location?.href : undefined) ??
    "";

  return {
    isTopFrame: window.top === window.self,
    frameUrl: locationHref
  };
}
