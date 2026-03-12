import { SESSION_BOOST_STATE_STORAGE_KEY } from "../constants";
import type { SessionBoostRepositoryApi, SessionBoostRepositoryContext } from "./contracts";
import { SESSION_BOOST_STORAGE_AREA } from "./contracts";
import { sanitizeSessionBoostState } from "./sanitize-session-boost-state";

export async function getSessionBoostState(
  this: SessionBoostRepositoryApi & SessionBoostRepositoryContext
) {
  const result = await this[SESSION_BOOST_STORAGE_AREA].get(SESSION_BOOST_STATE_STORAGE_KEY);
  return sanitizeSessionBoostState(result[SESSION_BOOST_STATE_STORAGE_KEY]);
}
