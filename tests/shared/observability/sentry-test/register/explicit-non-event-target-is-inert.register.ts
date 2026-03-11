import { runExplicitNonEventTargetIsInertCase } from "../callback/explicit-non-event-target-is-inert.callback";

export function registerExplicitNonEventTargetIsInertCase(): void {
  it("treats an explicit non-event-target object as inert and preserves initialization state", runExplicitNonEventTargetIsInertCase);
}
