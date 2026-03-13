import type { LoudnessBiquadState } from "./loudness-estimator-state";

export function stepLoudnessBiquad(state: LoudnessBiquadState, input: number): number {
  const output =
    state.b0 * input +
    state.b1 * state.x1 +
    state.b2 * state.x2 -
    state.a1 * state.y1 -
    state.a2 * state.y2;

  state.x2 = state.x1;
  state.x1 = input;
  state.y2 = state.y1;
  state.y1 = output;
  return output;
}
