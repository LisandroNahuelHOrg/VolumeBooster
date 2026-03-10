/**
 * @fileoverview Public facade for shared advanced audio-setting helpers.
 *
 * @cohesive Index/barrel file - module exports
 * @module shared/audio-settings
 */

export type { DspRuntimeParameters } from "./audio-settings/contracts";
export { QUALITY_PRESET_ORDER } from "./audio-settings/quality-preset-order";
export { QUALITY_PROTECTOR_MODE_ORDER } from "./audio-settings/quality-protector-mode-order";
export { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "./audio-settings/default-advanced-audio-settings";
export { applyQualityPreset } from "./audio-settings/apply-quality-preset";
export { sanitizeAdvancedAudioSettings } from "./audio-settings/sanitize-advanced-audio-settings";
export { buildDspRuntimeParameters } from "./audio-settings/build-dsp-runtime-parameters";
export { applyQualityProtector } from "./audio-settings/apply-quality-protector";
export { deriveMetricsFromPeaks } from "./audio-settings/derive-metrics-from-peaks";
export { deriveWarningFromMetrics } from "./audio-settings/derive-warning-from-metrics";
export { deriveProtectionLoadPercent } from "./audio-settings/derive-protection-load-percent";
export { deriveClippingSafetyMarginDb } from "./audio-settings/derive-clipping-safety-margin-db";
export { createDefaultMetrics } from "./audio-settings/create-default-metrics";
export { isProtectionBypassedSettings } from "./audio-settings/is-protection-bypassed-settings";
