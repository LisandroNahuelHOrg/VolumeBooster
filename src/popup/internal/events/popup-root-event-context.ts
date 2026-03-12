import type { AudioQualityProtectorMode, QualityPreset } from "../../../shared/types";
import type { PopupCommandContext } from "../commands/popup-command-context";
import type { PopupCommitContext } from "../commits/popup-commit-context";
import type { AdvancedControlKey } from "../config/advanced-control-config";
import type { PopupDomRuntime } from "../dom/popup-dom-runtime-types";
import type { PopupGainPointerRuntime } from "../dom/popup-dom-runtime-types";

export interface PopupRootClickContext {
  commandContext: PopupCommandContext;
  commitContext: PopupCommitContext;
}

export interface PopupRootInputContext {
  commitContext: PopupCommitContext;
}

export interface PopupRootChangeContext {
  commitContext: PopupCommitContext;
}

export interface PopupRootPointerContext {
  popupGainPointerRuntime: PopupGainPointerRuntime;
}

export interface PopupRootTooltipContext {
  document: Document;
  popupDomRuntime: PopupDomRuntime;
}
