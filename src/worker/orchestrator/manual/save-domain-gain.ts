import { getDomainFromUrl } from "../../../shared/domain";
import { clampGainPercent } from "../../../shared/gain";
import { message } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { broadcastState } from "../state/broadcast-state";

export async function saveDomainGain(runtime: WorkerRuntimeState, tabId: number, gainPercent: number): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId);
  const domain = getDomainFromUrl(targetTab.url);

  if (!domain) {
    throw message("errorRememberUnavailable");
  }

  await runtime.settingsRepository.setDomainGain(domain, clampGainPercent(gainPercent));
  await broadcastState(runtime);
}
