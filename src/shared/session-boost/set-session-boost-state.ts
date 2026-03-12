import { SESSION_BOOST_STATE_STORAGE_KEY } from "../constants";
import type { SessionBoostState } from "../boost-settings-bundle";
import type { SessionBoostRepositoryApi, SessionBoostRepositoryContext } from "./contracts";
import { SESSION_BOOST_STORAGE_AREA } from "./contracts";
import { sanitizeSessionBoostState } from "./sanitize-session-boost-state";

export async function setSessionBoostState(
  this: SessionBoostRepositoryApi & SessionBoostRepositoryContext,
  state: SessionBoostState
) {
  const sanitizedState = sanitizeSessionBoostState(state);
  await this[SESSION_BOOST_STORAGE_AREA].set({
    [SESSION_BOOST_STATE_STORAGE_KEY]: sanitizedState
  });
  return sanitizedState;
}
