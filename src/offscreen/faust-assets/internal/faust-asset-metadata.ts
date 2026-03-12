import type { FaustDspMeta } from "@grame/faustwasm";
import monoMeta from "../../../generated/faust/mono/dsp-meta";
import stereoMeta from "../../../generated/faust/stereo/dsp-meta";

export const monoDspMeta = monoMeta as unknown as FaustDspMeta;
export const stereoDspMeta = stereoMeta as unknown as FaustDspMeta;
