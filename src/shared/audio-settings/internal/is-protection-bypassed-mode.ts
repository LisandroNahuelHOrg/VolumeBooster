import type { AudioQualityProtectorMode } from "../../types";
import { getQualityProtectorDefinition } from "./get-quality-protector-definition";

export function isProtectionBypassedMode(mode: AudioQualityProtectorMode): boolean {
  return !getQualityProtectorDefinition(mode).protectorEnabled;
}
