import type { StorageAreaLike } from "../storage";
import {
  SESSION_BOOST_STORAGE_AREA,
  type SessionBoostRepositoryApi,
  type SessionBoostRepositoryContext
} from "./contracts";
import { getSessionBoostStorageArea } from "./get-session-boost-storage-area";
import { sessionBoostRepositoryPrototype } from "./session-boost-repository-prototype";

export class SessionBoostRepository implements SessionBoostRepositoryContext {
  readonly [SESSION_BOOST_STORAGE_AREA]: StorageAreaLike;

  constructor(storageArea: StorageAreaLike = getSessionBoostStorageArea()) {
    this[SESSION_BOOST_STORAGE_AREA] = storageArea;
  }
}

export interface SessionBoostRepository extends SessionBoostRepositoryApi {}

Object.assign(SessionBoostRepository.prototype, sessionBoostRepositoryPrototype);
