import type { WorkerRuntimeState } from "../runtime-state";

export async function dismissSessionBoostPrompt(runtime: WorkerRuntimeState): Promise<void> {
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  sessionBoostState.promptDismissed = true;
  await runtime.sessionBoostRepository.setState(sessionBoostState);
}
