import type { PopupCommandContext } from "../commands/popup-command-context";
import type { PopupCommitContext } from "../commits/popup-commit-context";
import type {
  PopupRuntimeRefs,
  PopupRuntimeState
} from "../runtime/popup-runtime-types";

export interface PopupRootContextFactoryParams {
  commandContext: PopupCommandContext;
  commitContext: PopupCommitContext;
  refs: PopupRuntimeRefs;
  state: PopupRuntimeState;
}
