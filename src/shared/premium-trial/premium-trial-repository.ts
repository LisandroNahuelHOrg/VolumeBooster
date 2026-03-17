import type {
  PremiumTrialRepositoryApi,
  PremiumTrialRepositoryContext,
  PremiumTrialStorageAreaLike
} from "./premium-trial-types";
import { createFallbackPremiumTrialStorageArea } from "./create-fallback-premium-trial-storage-area";
import { premiumTrialRepositoryPrototype } from "./premium-trial-repository-prototype";

export class PremiumTrialRepository implements PremiumTrialRepositoryContext {
  readonly localStorageArea: PremiumTrialStorageAreaLike;
  readonly syncStorageArea: PremiumTrialStorageAreaLike | null;

  constructor(
    localStorageArea: PremiumTrialStorageAreaLike =
      globalThis.chrome?.storage?.local ?? createFallbackPremiumTrialStorageArea(),
    syncStorageArea: PremiumTrialStorageAreaLike | null =
      globalThis.chrome?.storage?.sync ?? null
  ) {
    this.localStorageArea = localStorageArea;
    this.syncStorageArea = syncStorageArea;
  }
}

export interface PremiumTrialRepository extends PremiumTrialRepositoryApi {}

Object.assign(PremiumTrialRepository.prototype, premiumTrialRepositoryPrototype);
