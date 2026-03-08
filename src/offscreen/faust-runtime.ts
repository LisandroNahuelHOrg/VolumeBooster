/**
 * @fileoverview Constantes compartidas para resolver nombres de procesadores y
 * rutas de assets Faust.
 */
export type DspVariant = "mono" | "stereo";

export const WORKLET_PATHS: Record<DspVariant, string> = {
  mono: "assets/faust-mono-worklet.js",
  stereo: "assets/faust-stereo-worklet.js"
};

export const PROCESSOR_NAMES: Record<DspVariant, string> = {
  mono: "prism-premium-mono-processor",
  stereo: "prism-premium-stereo-processor"
};

export const FACTORY_ASSET_PATHS: Record<DspVariant, { wasm: string; json: string }> = {
  mono: {
    wasm: "faust/mono/dsp-module.wasm",
    json: "faust/mono/dsp-meta.json"
  },
  stereo: {
    wasm: "faust/stereo/dsp-module.wasm",
    json: "faust/stereo/dsp-meta.json"
  }
};
