import type { AutoFrameRegistryMethods } from "./auto-frame-registry-methods";
import { createAutoFrameRegistryMethodTable } from "./create-auto-frame-registry-method-table";
import { createAutoFrameRegistryState } from "./create-auto-frame-registry-state";

export class AutoFrameRegistry implements AutoFrameRegistryMethods {
  declare readonly upsertKnownFrame: AutoFrameRegistryMethods["upsertKnownFrame"];
  declare readonly updateFrameState: AutoFrameRegistryMethods["updateFrameState"];
  declare readonly getKnownFrames: AutoFrameRegistryMethods["getKnownFrames"];
  declare readonly getTopFrame: AutoFrameRegistryMethods["getTopFrame"];
  declare readonly getFrameStates: AutoFrameRegistryMethods["getFrameStates"];
  declare readonly getFrameState: AutoFrameRegistryMethods["getFrameState"];
  declare readonly removeFrame: AutoFrameRegistryMethods["removeFrame"];
  declare readonly clearTab: AutoFrameRegistryMethods["clearTab"];
  declare readonly markToastVisible: AutoFrameRegistryMethods["markToastVisible"];
  declare readonly markToastDismissed: AutoFrameRegistryMethods["markToastDismissed"];
  declare readonly isToastDismissed: AutoFrameRegistryMethods["isToastDismissed"];
  declare readonly resetToastStateForTab: AutoFrameRegistryMethods["resetToastStateForTab"];

  constructor() {
    Object.assign(this, createAutoFrameRegistryMethodTable(createAutoFrameRegistryState()));
  }
}
