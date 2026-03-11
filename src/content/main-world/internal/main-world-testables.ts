import { createMainWorldController } from "./create-main-world-controller";
import { createMainWorldBridgeState } from "./graph/create-main-world-bridge-state";
import { createMainWorldSoftClipCurve } from "./graph/create-main-world-soft-clip-curve";
import { clampNumber } from "./math/clamp-number";
import { dbToGain } from "./math/db-to-gain";
import { pickHighestWarning } from "./math/pick-highest-warning";
import { roundTo } from "./math/round-to";
import type { MainWorldTestables } from "./main-world-runtime-state";
import { getMainWorldAutoplayPolicy } from "./controller/get-main-world-autoplay-policy";
import { createMainWorldAnalyser } from "./telemetry/create-main-world-analyser";
import { readMainWorldPeak } from "./telemetry/read-main-world-peak";

export const mainWorldTestables = {
  createMainWorldController,
  createBridgeState: createMainWorldBridgeState,
  createAnalyser: createMainWorldAnalyser,
  createSoftClipCurve: createMainWorldSoftClipCurve,
  readPeak: readMainWorldPeak,
  getAutoplayPolicy: getMainWorldAutoplayPolicy,
  dbToGain,
  clampNumber,
  roundTo,
  pickHighestWarning
} satisfies MainWorldTestables;
