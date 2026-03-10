import type { AudioQualityProtectorMode } from "../../types";
import {
  QUALITY_PROTECTOR_TABLE,
  type QualityProtectorDefinition
} from "../quality-protector-table";
import { sanitizeQualityProtectorMode } from "./sanitize-quality-protector-mode";

export function getQualityProtectorDefinition(
  mode: AudioQualityProtectorMode
): QualityProtectorDefinition {
  return QUALITY_PROTECTOR_TABLE[sanitizeQualityProtectorMode(mode)];
}
