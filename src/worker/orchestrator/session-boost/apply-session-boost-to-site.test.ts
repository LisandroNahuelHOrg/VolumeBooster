import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { createTestRuntime, makeSession } from "../test-harness";
import { applySessionBoostToSite } from "./apply-session-boost-to-site";

test("clears the global draft after applying the session boost to one site", async () => {
  const { offscreenClient, runtime, sessionBoostRepository, storage } = createTestRuntime();
  const session = makeSession(7, "youtube.com", 220);

  runtime.manualSessions.set(7, session);
  runtime.sessions.set(7, session);
  offscreenClient.getSnapshot.mockResolvedValue([session]);
  offscreenClient.updateMetadata.mockResolvedValue([makeSession(7, "youtube.com", 260)]);
  vi.stubGlobal("chrome", {
    action: {
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeTextColor: vi.fn().mockResolvedValue(undefined)
    },
    runtime: { sendMessage: vi.fn().mockResolvedValue(undefined) },
    tabs: {
      get: vi.fn().mockResolvedValue({ id: 7, url: "https://youtube.com/watch?v=1" }),
      query: vi.fn().mockResolvedValue([{ id: 7, url: "https://youtube.com/watch?v=1" }])
    }
  } as unknown as typeof chrome);

  await sessionBoostRepository.setState({
    globalDraftBundle: {
      gainPercent: 260,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    siteSessionBundles: {},
    promptDismissed: false
  });
  await applySessionBoostToSite(runtime, 7);

  await expect(storage.getSettings()).resolves.toMatchObject({
    domainAudioSettings: {
      "youtube.com": { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    domainGains: { "youtube.com": 260 }
  });
  await expect(sessionBoostRepository.getState()).resolves.toMatchObject({
    globalDraftBundle: null
  });
});
