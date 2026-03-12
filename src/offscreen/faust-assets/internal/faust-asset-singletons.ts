import { createFaustAsset } from "./create-faust-asset";
import { monoDspMeta, stereoDspMeta } from "./faust-asset-metadata";

export const MONO_FAUST_ASSET = createFaustAsset("mono", monoDspMeta);
export const STEREO_FAUST_ASSET = createFaustAsset("stereo", stereoDspMeta);
