import type { WorkerRuntimeState } from "../runtime-state";

export function stopBadgePulseTimer(runtime: WorkerRuntimeState): void {
  if (runtime.badgePulseTimer !== null) {
    globalThis.clearInterval(runtime.badgePulseTimer);
    runtime.badgePulseTimer = null;
  }

  runtime.badgePulseHighlighted = false;
}
