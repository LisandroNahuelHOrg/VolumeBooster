import type { DspRuntimeParameters } from "../contracts";

export function isProtectionBypassedRuntime(runtime: DspRuntimeParameters): boolean {
  return !runtime.protectorEnabled && !runtime.outputLimiterEnabled && runtime.outputSoftClipMix <= 0.01;
}
