/**
 * @fileoverview Resolución de assets Faust precompilados y mapping de sus
 * controles a nombres tipados usados por el engine premium.
 */
export type {
  DspControlKey,
  FaustAssetDescriptor
} from "./faust-assets/faust-asset-types";
export {
  MONO_FAUST_ASSET,
  STEREO_FAUST_ASSET
} from "./faust-assets/internal/faust-asset-singletons";
export { selectFaustAsset } from "./faust-assets/internal/select-faust-asset";
