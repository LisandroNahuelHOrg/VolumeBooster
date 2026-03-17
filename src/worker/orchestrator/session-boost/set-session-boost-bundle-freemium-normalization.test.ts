import { expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import { DEFAULT_PREMIUM_ENTITLEMENT_STATE } from "../../../shared/premium-license";

const sessionBoostNormalizationMocks = vi.hoisted(() => ({
  resolveWorkerPremiumEntitlement: vi.fn(),
  syncSessionBoostAcrossRuntime: vi.fn()
}));

vi.mock("../premium/resolve-worker-premium-entitlement", () => ({
  resolveWorkerPremiumEntitlement: sessionBoostNormalizationMocks.resolveWorkerPremiumEntitlement
}));
vi.mock("./sync-session-boost-across-runtime", () => ({
  syncSessionBoostAcrossRuntime: sessionBoostNormalizationMocks.syncSessionBoostAcrossRuntime
}));

import { setSessionBoostBundle } from "./set-session-boost-bundle";

test("sanitizes premium normalization settings back to freemium defaults before storing the draft bundle", async () => {
  vi.stubGlobal("chrome", {
    tabs: { get: vi.fn().mockResolvedValue({ id: 91, url: "https://example.com/watch" }) }
  } as unknown as typeof chrome);
  sessionBoostNormalizationMocks.resolveWorkerPremiumEntitlement.mockResolvedValue(
    DEFAULT_PREMIUM_ENTITLEMENT_STATE
  );
  const sessionBoostState = { globalDraftBundle: null, promptDismissed: true, siteSessionBundles: {} };
  const runtime = {
    sessionBoostRepository: {
      getState: vi.fn().mockResolvedValue(sessionBoostState),
      setState: vi.fn().mockResolvedValue(undefined)
    }
  };
  const bundle = {
    gainPercent: 100,
    advancedAudioSettings: applyQualityPreset("bass_boost", "clarity", "aggressive", 112)
  };

  await setSessionBoostBundle(runtime as never, 91, bundle);

  expect(runtime.sessionBoostRepository.setState).toHaveBeenCalledWith({
    globalDraftBundle: {
      gainPercent: 100,
      advancedAudioSettings: expect.objectContaining({
        volumeNormalizationMode: "off",
        volumeNormalizationTargetPercent: 100
      })
    },
    promptDismissed: false,
    siteSessionBundles: {}
  });
  expect(sessionBoostNormalizationMocks.syncSessionBoostAcrossRuntime).toHaveBeenCalledWith(
    runtime
  );

  vi.unstubAllGlobals();
});
