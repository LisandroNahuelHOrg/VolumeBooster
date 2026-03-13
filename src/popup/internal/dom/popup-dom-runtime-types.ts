export interface PopupDomRuntime {
  activeHelpTooltipAnchor: HTMLElement | null;
  tooltipRefreshFrame: number | null;
  gainSliderAnimationFrame: number | null;
  gainSliderAnimationTarget: number | null;
  sessionBoostAcknowledgeTimer: number | null;
  sessionBoostBarRevealFrame: number | null;
  visualGainPercent: number;
  laneLayoutTransitionTimer: number | null;
}

export interface PopupGainPointerRuntime {
  pendingGainTrackJumpAnimationAt: number;
  pendingGainTrackJumpPointerId: number | null;
  pendingGainTrackJumpStartX: number | null;
  pendingGainTrackJumpMoved: boolean;
}
