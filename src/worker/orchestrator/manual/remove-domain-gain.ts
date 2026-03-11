import { getDomainFromUrl } from "../../../shared/domain";
import { message } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { broadcastState } from "../state/broadcast-state";

export async function removeDomainGain(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId);
  const domain = getDomainFromUrl(targetTab.url);

  if (!domain) {
    throw message("errorForgetUnavailable");
  }

  await runtime.settingsRepository.removeDomainGain(domain);
  await broadcastState(runtime);
}
