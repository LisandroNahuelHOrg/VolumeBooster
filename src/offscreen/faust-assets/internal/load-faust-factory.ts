import type { LooseFaustDspFactory } from "@grame/faustwasm";
import { FACTORY_ASSET_PATHS, type DspVariant } from "../../faust-runtime";
import { factoryCache } from "./faust-asset-cache";
import { loadFactoryFromRuntimeAssets } from "./load-factory-from-runtime-assets";

export function loadFaustFactory(variant: DspVariant): Promise<Required<LooseFaustDspFactory>> {
  const cached = factoryCache.get(variant);

  if (cached) {
    return cached;
  }

  const next = loadFactoryFromRuntimeAssets(FACTORY_ASSET_PATHS[variant]);
  factoryCache.set(variant, next);
  return next;
}
