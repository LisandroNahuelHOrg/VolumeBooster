import type { FaustAssetDescriptor } from "../faust-asset-types";
import { MONO_FAUST_ASSET, STEREO_FAUST_ASSET } from "./faust-asset-singletons";

export function selectFaustAsset(channelCount: number | undefined): FaustAssetDescriptor {
  return channelCount && channelCount <= 1 ? MONO_FAUST_ASSET : STEREO_FAUST_ASSET;
}
