import type { SessionBoostRepositoryApi } from "./contracts";
import { getSessionBoostState } from "./get-session-boost-state";
import { setSessionBoostState } from "./set-session-boost-state";

export const sessionBoostRepositoryPrototype: SessionBoostRepositoryApi = {
  getState: getSessionBoostState,
  setState: setSessionBoostState
};
