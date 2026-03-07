/**
 * @fileoverview Resolución de assets Faust precompilados y mapping de sus
 * controles a nombres tipados usados por el engine premium.
 */
import type { FaustDspMeta, LooseFaustDspFactory } from "@grame/faustwasm";
import monoMeta from "../generated/faust/mono/dsp-meta";
import stereoMeta from "../generated/faust/stereo/dsp-meta";
import {
  FACTORY_ASSET_PATHS,
  PROCESSOR_NAMES,
  type DspVariant,
  WORKLET_PATHS
} from "./faust-runtime";

export type DspControlKey =
  | "inputDriveDb"
  | "lookaheadMs"
  | "releaseMs"
  | "multibandDepth"
  | "protectorEnabled"
  | "outputLimiterEnabled"
  | "lowBandTrimDb"
  | "lowBandMakeupDb"
  | "lowBandThresholdOffsetDb"
  | "lowBandRatioBias"
  | "midHighThresholdOffsetDb"
  | "outputCeilingDb"
  | "outputSoftClipMix"
  | "clarityPresenceTiltDb"
  | "toneLowBandGainDb"
  | "toneMidBandGainDb";

/**
 * Descriptor tipado del asset DSP necesario para construir un worklet Faust.
 */
export interface FaustAssetDescriptor {
  readonly meta: FaustDspMeta;
  readonly processorName: string;
  readonly workletModulePath: string;
  readonly controlPaths: Record<DspControlKey, string>;
  loadFactory(): Promise<Required<LooseFaustDspFactory>>;
}

const factoryCache = new Map<DspVariant, Promise<Required<LooseFaustDspFactory>>>();
const monoDspMeta = monoMeta as unknown as FaustDspMeta;
const stereoDspMeta = stereoMeta as unknown as FaustDspMeta;

export const MONO_FAUST_ASSET = createFaustAsset("mono", monoDspMeta);
export const STEREO_FAUST_ASSET = createFaustAsset("stereo", stereoDspMeta);

/**
 * Selecciona el asset Faust adecuado según el número de canales del stream.
 */
export function selectFaustAsset(channelCount: number | undefined): FaustAssetDescriptor {
  return channelCount && channelCount <= 1 ? MONO_FAUST_ASSET : STEREO_FAUST_ASSET;
}

/**
 * Construye un descriptor de asset a partir del metadata Faust generado.
 */
function createFaustAsset(variant: DspVariant, meta: FaustDspMeta): FaustAssetDescriptor {
  return {
    meta,
    processorName: PROCESSOR_NAMES[variant],
    workletModulePath: WORKLET_PATHS[variant],
    controlPaths: buildControlPaths(meta),
    loadFactory: () => loadFactory(variant)
  };
}

/**
 * Recorre recursivamente la UI de Faust para resolver todas las direcciones de
 * control exigidas por el runtime.
 */
function buildControlPaths(meta: FaustDspMeta): Record<DspControlKey, string> {
  const addressByShortName = new Map<string, string>();
  const visitItems = (items: Array<{ items?: unknown; shortname?: string; address?: string }>) => {
    for (const item of items) {
      if (Array.isArray(item.items)) {
        visitItems(item.items as Array<{ items?: unknown; shortname?: string; address?: string }>);
        continue;
      }

      if (typeof item.shortname === "string" && typeof item.address === "string") {
        addressByShortName.set(item.shortname, item.address);
      }
    }
  };

  visitItems(meta.ui as Array<{ items?: unknown; shortname?: string; address?: string }>);

  return {
    inputDriveDb: requireControlPath(addressByShortName, "controls_input_drive_db", meta.name),
    lookaheadMs: requireControlPath(addressByShortName, "controls_lookahead_ms", meta.name),
    releaseMs: requireControlPath(addressByShortName, "controls_release_ms", meta.name),
    multibandDepth: requireControlPath(addressByShortName, "controls_multiband_depth", meta.name),
    protectorEnabled: requireControlPath(addressByShortName, "controls_protector_enabled", meta.name),
    outputLimiterEnabled: requireControlPath(addressByShortName, "controls_output_limiter_enabled", meta.name),
    lowBandTrimDb: requireControlPath(addressByShortName, "controls_low_band_trim_db", meta.name),
    lowBandMakeupDb: requireControlPath(addressByShortName, "controls_low_band_makeup_db", meta.name),
    lowBandThresholdOffsetDb: requireControlPath(
      addressByShortName,
      "controls_low_band_threshold_offset_db",
      meta.name
    ),
    lowBandRatioBias: requireControlPath(addressByShortName, "controls_low_band_ratio_bias", meta.name),
    midHighThresholdOffsetDb: requireControlPath(
      addressByShortName,
      "controls_mid_high_threshold_offset_db",
      meta.name
    ),
    outputCeilingDb: requireControlPath(addressByShortName, "controls_output_ceiling_db", meta.name),
    outputSoftClipMix: requireControlPath(addressByShortName, "controls_output_soft_clip_mix", meta.name),
    clarityPresenceTiltDb: requireControlPath(
      addressByShortName,
      "controls_clarity_presence_tilt_db",
      meta.name
    ),
    toneLowBandGainDb: requireControlPath(addressByShortName, "controls_tone_low_band_gain_db", meta.name),
    toneMidBandGainDb: requireControlPath(addressByShortName, "controls_tone_mid_band_gain_db", meta.name)
  };
}

/**
 * Exige la presencia de una ruta de control específica dentro del metadata
 * Faust.
 */
function requireControlPath(map: Map<string, string>, shortName: string, dspName: string): string {
  const address = map.get(shortName);

  if (!address) {
    throw new Error(`Missing Faust control path "${shortName}" for ${dspName}.`);
  }

  return address;
}

/**
 * Carga y cachea la factoría WASM correspondiente a una variante DSP.
 */
function loadFactory(variant: DspVariant): Promise<Required<LooseFaustDspFactory>> {
  const cached = factoryCache.get(variant);

  if (cached) {
    return cached;
  }

  const next = loadFactoryFromRuntimeAssets(FACTORY_ASSET_PATHS[variant]);
  factoryCache.set(variant, next);
  return next;
}

/**
 * Descarga y compila en runtime los assets WASM/JSON empaquetados por la
 * extensión.
 */
async function loadFactoryFromRuntimeAssets(paths: {
  wasm: string;
  json: string;
}): Promise<Required<LooseFaustDspFactory>> {
  const wasmUrl = chrome.runtime.getURL(paths.wasm);
  const jsonUrl = chrome.runtime.getURL(paths.json);
  const [wasmResponse, jsonResponse] = await Promise.all([fetch(wasmUrl), fetch(jsonUrl)]);

  if (!wasmResponse.ok) {
    throw new Error(`Faust WASM asset could not be loaded: ${wasmUrl}`);
  }

  if (!jsonResponse.ok) {
    throw new Error(`Faust metadata asset could not be loaded: ${jsonUrl}`);
  }

  const [wasmBuffer, json] = await Promise.all([wasmResponse.arrayBuffer(), jsonResponse.text()]);
  const code = new Uint8Array(wasmBuffer);
  const module = await WebAssembly.compile(code);
  const compileOptions = parseCompileOptions(json);

  return {
    cfactory: 0,
    code,
    module,
    json,
    poly: compileOptions.includes("wasm-e"),
    shaKey: "",
    soundfiles: {}
  };
}

/**
 * Extrae las opciones de compilación Faust desde el metadata serializado.
 */
function parseCompileOptions(json: string): string {
  const parsed = JSON.parse(json) as { compile_options?: unknown };
  return typeof parsed.compile_options === "string" ? parsed.compile_options : "";
}
