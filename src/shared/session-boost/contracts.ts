import type { SessionBoostState } from "../boost-settings-bundle";
import type { StorageAreaLike } from "../storage";

export const SESSION_BOOST_STORAGE_AREA = Symbol("SessionBoostRepository.storageArea");

export interface SessionBoostRepositoryContext {
  readonly [SESSION_BOOST_STORAGE_AREA]: StorageAreaLike;
}

export interface SessionBoostRepositoryApi {
  getState(this: SessionBoostRepositoryApi & SessionBoostRepositoryContext): Promise<SessionBoostState>;
  setState(
    this: SessionBoostRepositoryApi & SessionBoostRepositoryContext,
    state: SessionBoostState
  ): Promise<SessionBoostState>;
}
