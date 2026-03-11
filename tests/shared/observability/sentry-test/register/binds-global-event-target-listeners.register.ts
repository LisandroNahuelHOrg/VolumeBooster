import { runBindsGlobalEventTargetListenersCase } from "../callback/binds-global-event-target-listeners.callback";

export function registerBindsGlobalEventTargetListenersCase(): void {
  it("binds listeners through the global event target when no explicit target is provided", runBindsGlobalEventTargetListenersCase);
}
