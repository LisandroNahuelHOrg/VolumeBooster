import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import type { KnownAutoFrame } from "./known-auto-frame";

export function createAutoFrameRegistryState(): AutoFrameRegistryState {
  return {
    knownFramesByTab: new Map<number, Map<string, KnownAutoFrame>>(),
    frameStatesByTab: new Map<number, Map<string, AutoFrameRuntimeState>>()
  };
}
