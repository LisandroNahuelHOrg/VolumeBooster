import type { AutoFrameRuntimeState } from "../../shared/types";
import type { KnownAutoFrame } from "./known-auto-frame";

export interface AutoFrameRegistryState {
  knownFramesByTab: Map<number, Map<string, KnownAutoFrame>>;
  frameStatesByTab: Map<number, Map<string, AutoFrameRuntimeState>>;
}
