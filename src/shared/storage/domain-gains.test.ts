/**
 * @fileoverview Characterization coverage for domain gain persistence helpers.
 * @module shared/storage/domain-gains.test
 */

import { assertDomainGainIsClampedBeforeStorage } from "./tests/cases/assert-domain-gain-is-clamped-before-storage";
import { assertDomainGainRoundTripAndReset } from "./tests/cases/assert-domain-gain-round-trip-and-reset";
import { assertEmptyDomainSkipsStorageWork } from "./tests/cases/assert-empty-domain-skips-storage-work";
import { assertStoredDomainGainCanBeRemoved } from "./tests/cases/assert-stored-domain-gain-can-be-removed";

describe("SettingsRepository domain gains", () => {
  it("gets and writes domain gains, removing the entry when it returns to default", assertDomainGainRoundTripAndReset);
  it("clamps persisted domain gains before storing them", assertDomainGainIsClampedBeforeStorage);
  it("skips storage work entirely when domain arguments are empty", assertEmptyDomainSkipsStorageWork);
  it("removes a stored domain gain and ignores empty domains", assertStoredDomainGainCanBeRemoved);
});
