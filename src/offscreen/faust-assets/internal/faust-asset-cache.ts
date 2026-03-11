import type { LooseFaustDspFactory } from "@grame/faustwasm";
import type { DspVariant } from "../../faust-runtime";

export const factoryCache = new Map<DspVariant, Promise<Required<LooseFaustDspFactory>>>();
