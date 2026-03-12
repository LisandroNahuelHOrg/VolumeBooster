import type { WorkerRuntimeState } from "../runtime-state";
import { syncConfiguredAutoTabs } from "../auto/sync-configured-auto-tabs";
import { syncFromOffscreen } from "../manual/sync-from-offscreen";
import { replaceManualSessions } from "../manual/replace-manual-sessions";
import { broadcastState } from "../state/broadcast-state";
import { resolveEffectiveBoostSettingsBundle } from "./resolve-effective-boost-settings-bundle";

export async function syncSessionBoostAcrossRuntime(runtime: WorkerRuntimeState): Promise<void> {
  await syncFromOffscreen(runtime);
  const settings = await runtime.settingsRepository.getSettings();
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  let nextManualSnapshot: Awaited<ReturnType<typeof runtime.offscreenClient.getSnapshot>> | null = null;

  for (const session of runtime.manualSessions.values()) {
    const bundle = resolveEffectiveBoostSettingsBundle(settings, sessionBoostState, session.domain);
    nextManualSnapshot = await runtime.offscreenClient.updateMetadata({
      tabId: session.tabId,
      title: session.title,
      url: session.url,
      domain: session.domain,
      favIconUrl: session.favIconUrl,
      gainPercent: bundle.gainPercent,
      advancedAudioSettings: bundle.advancedAudioSettings
    });
  }

  if (nextManualSnapshot) {
    replaceManualSessions(runtime, nextManualSnapshot);
  }

  await syncConfiguredAutoTabs(runtime);
  await broadcastState(runtime);
}
