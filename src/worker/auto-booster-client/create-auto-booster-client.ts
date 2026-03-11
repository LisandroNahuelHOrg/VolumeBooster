import type { AutoBoosterClient } from "./auto-booster-client-contract";
import { configureAutoBooster } from "./configure-auto-booster";
import { disableAutoBooster } from "./disable-auto-booster";
import { getAutoBoosterDebugState } from "./get-auto-booster-debug-state";
import { hasGlobalPermission } from "./has-global-permission";
import { injectRegisteredScriptsIntoTab } from "./inject-registered-scripts-into-tab";
import { queryInjectableTabs } from "./query-injectable-tabs";
import { registerGlobalContentScripts } from "./register-global-content-scripts";
import { requestGlobalPermission } from "./request-global-permission";
import { unregisterGlobalContentScripts } from "./unregister-global-content-scripts";

export function createAutoBoosterClient(): AutoBoosterClient {
  return {
    configure: configureAutoBooster,
    disable: disableAutoBooster,
    getDebugState: getAutoBoosterDebugState,
    requestGlobalPermission,
    hasGlobalPermission,
    queryInjectableTabs,
    registerGlobalContentScripts,
    unregisterGlobalContentScripts,
    injectRegisteredScriptsIntoTab
  };
}
