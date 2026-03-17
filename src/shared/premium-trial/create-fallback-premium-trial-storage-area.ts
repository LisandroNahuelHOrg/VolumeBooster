import type { PremiumTrialStorageAreaLike } from "./premium-trial-types";

export function createFallbackPremiumTrialStorageArea(): PremiumTrialStorageAreaLike {
  return {
    get: async () => ({}),
    set: async () => undefined
  };
}
