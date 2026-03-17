export interface PersistedPremiumTrialRecord {
  version: 1;
  firstInstalledAt: string;
  trialEndsAt: string;
  trialConsumed: boolean;
  lastSeenAt: string;
}

export interface PremiumTrialStorageAreaLike {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface PremiumTrialRepositoryContext {
  localStorageArea: PremiumTrialStorageAreaLike;
  syncStorageArea: PremiumTrialStorageAreaLike | null;
}

export interface PremiumTrialRepositoryApi {
  ensureTrialRecord(
    this: PremiumTrialRepositoryApi & PremiumTrialRepositoryContext,
    nowMs: number
  ): Promise<PersistedPremiumTrialRecord>;
}
