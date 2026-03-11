import { registerBindsGlobalEventTargetListenersCase } from "../register/binds-global-event-target-listeners.register";
import { registerExplicitNonEventTargetIsInertCase } from "../register/explicit-non-event-target-is-inert.register";
import { registerCapturesGlobalErrorsAndRejectionsCase } from "../register/captures-global-errors-and-rejections.register";
import { registerIgnoresBlankGlobalErrorMessagesCase } from "../register/ignores-blank-global-error-messages.register";

export function defineEventTargetAndListenersSuite(): void {
  registerBindsGlobalEventTargetListenersCase();
  registerExplicitNonEventTargetIsInertCase();
  registerCapturesGlobalErrorsAndRejectionsCase();
  registerIgnoresBlankGlobalErrorMessagesCase();
}
