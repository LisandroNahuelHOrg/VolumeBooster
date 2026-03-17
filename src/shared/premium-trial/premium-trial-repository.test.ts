import { expect, test, vi } from "vitest";
import { createMemoryStorage } from "../../worker/orchestrator/internal/test-harness/create-memory-storage";
import { PREMIUM_TRIAL_STORAGE_KEY } from "./premium-trial-constants";
import { PremiumTrialRepository } from "./premium-trial-repository";
import { readPremiumTrialRecordFromIndexedDb } from "./read-premium-trial-record-from-indexed-db";
import { writePremiumTrialRecordToIndexedDb } from "./write-premium-trial-record-to-indexed-db";

vi.mock("./read-premium-trial-record-from-indexed-db", () => ({
  readPremiumTrialRecordFromIndexedDb: vi.fn()
}));
vi.mock("./write-premium-trial-record-to-indexed-db", () => ({
  writePremiumTrialRecordToIndexedDb: vi.fn()
}));

const NOW_MS = Date.parse("2026-03-16T00:00:00.000Z");
const NOW_ISO = new Date(NOW_MS).toISOString();

test("creates a new trial record when no prior evidence exists", async () => {
  const local = createMemoryStorage();
  const sync = createMemoryStorage();

  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockReset();
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockReset();
  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockResolvedValue(null);
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockResolvedValue(undefined);

  const record = await new PremiumTrialRepository(local.area, sync.area).ensureTrialRecord(NOW_MS);

  expect(record).toEqual({
    version: 1,
    firstInstalledAt: NOW_ISO,
    trialEndsAt: "2026-04-15T00:00:00.000Z",
    trialConsumed: false,
    lastSeenAt: NOW_ISO
  });
  await expect(local.area.get(PREMIUM_TRIAL_STORAGE_KEY)).resolves.toEqual({
    [PREMIUM_TRIAL_STORAGE_KEY]: record
  });
  await expect(sync.area.get(PREMIUM_TRIAL_STORAGE_KEY)).resolves.toEqual({
    [PREMIUM_TRIAL_STORAGE_KEY]: record
  });
});

test("prefers the oldest valid install timestamp and recomputes consumed state and last seen", async () => {
  const nowMs = Date.parse("2026-05-01T00:00:00.000Z");
  const local = createMemoryStorage();
  const sync = createMemoryStorage();

  await local.area.set({
    [PREMIUM_TRIAL_STORAGE_KEY]: {
      version: 1,
      firstInstalledAt: "2026-03-10T00:00:00.000Z",
      trialEndsAt: "2099-01-01T00:00:00.000Z",
      trialConsumed: false,
      lastSeenAt: "2026-03-10T00:00:00.000Z"
    }
  });
  await sync.area.set({
    [PREMIUM_TRIAL_STORAGE_KEY]: {
      version: 1,
      firstInstalledAt: "2026-03-01T00:00:00.000Z",
      trialEndsAt: "2099-01-01T00:00:00.000Z",
      trialConsumed: false,
      lastSeenAt: "2026-03-01T00:00:00.000Z"
    }
  });

  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockReset();
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockReset();
  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockResolvedValue({
    version: 1,
    firstInstalledAt: "2026-03-05T00:00:00.000Z",
    trialEndsAt: "2026-04-04T00:00:00.000Z",
    trialConsumed: false,
    lastSeenAt: "2026-03-05T00:00:00.000Z"
  });
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockResolvedValue(undefined);

  await expect(new PremiumTrialRepository(local.area, sync.area).ensureTrialRecord(nowMs)).resolves.toEqual({
    version: 1,
    firstInstalledAt: "2026-03-01T00:00:00.000Z",
    trialEndsAt: "2026-03-31T00:00:00.000Z",
    trialConsumed: true,
    lastSeenAt: "2026-05-01T00:00:00.000Z"
  });
});

test("ignores future or corrupt evidence and repairs storage with the canonical record", async () => {
  const local = createMemoryStorage();
  const sync = createMemoryStorage();

  await local.area.set({
    [PREMIUM_TRIAL_STORAGE_KEY]: {
      version: 1,
      firstInstalledAt: "2099-03-01T00:00:00.000Z",
      trialEndsAt: "2099-03-31T00:00:00.000Z",
      trialConsumed: false,
      lastSeenAt: "2099-03-01T00:00:00.000Z"
    }
  });
  await sync.area.set({
    [PREMIUM_TRIAL_STORAGE_KEY]: {
      version: 1,
      firstInstalledAt: "2026-03-02T00:00:00.000Z",
      trialEndsAt: "2026-04-01T00:00:00.000Z",
      trialConsumed: false,
      lastSeenAt: "2026-03-02T00:00:00.000Z"
    }
  });

  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockReset();
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockReset();
  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockResolvedValue(null);
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockResolvedValue(undefined);

  const record = await new PremiumTrialRepository(local.area, sync.area).ensureTrialRecord(NOW_MS);

  expect(record.firstInstalledAt).toBe("2026-03-02T00:00:00.000Z");
  await expect(local.area.get(PREMIUM_TRIAL_STORAGE_KEY)).resolves.toEqual({
    [PREMIUM_TRIAL_STORAGE_KEY]: record
  });
});

test("tolerates sync and indexeddb persistence failures without blocking the trial", async () => {
  const local = createMemoryStorage();
  const sync = {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockRejectedValue(new Error("sync unavailable"))
  };

  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockReset();
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockReset();
  vi.mocked(readPremiumTrialRecordFromIndexedDb).mockResolvedValue(null);
  vi.mocked(writePremiumTrialRecordToIndexedDb).mockRejectedValue(new Error("indexeddb unavailable"));

  await expect(new PremiumTrialRepository(local.area, sync).ensureTrialRecord(NOW_MS)).resolves.toEqual({
    version: 1,
    firstInstalledAt: NOW_ISO,
    trialEndsAt: "2026-04-15T00:00:00.000Z",
    trialConsumed: false,
    lastSeenAt: NOW_ISO
  });
});
