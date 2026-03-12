import type { FaustDspMeta } from "@grame/faustwasm";
import { PROCESSOR_NAMES, type DspVariant, WORKLET_PATHS } from "../../faust-runtime";
import type { FaustAssetDescriptor } from "../faust-asset-types";
import { buildControlPaths } from "./build-control-paths";
import { loadFaustFactory } from "./load-faust-factory";

export function createFaustAsset(variant: DspVariant, meta: FaustDspMeta): FaustAssetDescriptor {
  return {
    meta,
    processorName: PROCESSOR_NAMES[variant],
    workletModulePath: WORKLET_PATHS[variant],
    controlPaths: buildControlPaths(meta),
    loadFactory: loadFaustFactory.bind(undefined, variant) as FaustAssetDescriptor["loadFactory"]
  };
}
