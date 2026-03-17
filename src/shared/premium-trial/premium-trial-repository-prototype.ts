import type { PremiumTrialRepositoryApi } from "./premium-trial-types";
import { ensurePremiumTrialRecord } from "./ensure-premium-trial-record";

export const premiumTrialRepositoryPrototype: PremiumTrialRepositoryApi = {
  ensureTrialRecord: ensurePremiumTrialRecord
};
