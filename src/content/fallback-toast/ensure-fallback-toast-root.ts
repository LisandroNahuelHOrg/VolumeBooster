import { AUTO_BOOSTER_FALLBACK_TOAST_ID } from "../../shared/constants";
import { ensureContentUiFontFaces } from "../ui-font-runtime";
import { getI18nMessageSafe } from "../runtime-api";
import type { AutoFallbackToastInternals } from "./auto-fallback-toast-internals";
import {
  fallbackToastActionsStyle,
  fallbackToastBodyStyle,
  fallbackToastRootStyle,
  fallbackToastTitleStyle
} from "./fallback-toast-style-data";
import { getAutoFallbackToastOptions } from "./get-auto-fallback-toast-options";
import { stylePrimaryFallbackToastButton } from "./style-primary-fallback-toast-button";
import { styleSecondaryFallbackToastButton } from "./style-secondary-fallback-toast-button";

export function ensureFallbackToastRoot(toast: AutoFallbackToastInternals): HTMLDivElement {
  if (toast.root?.isConnected) {
    return toast.root;
  }

  ensureContentUiFontFaces(document);

  const options = getAutoFallbackToastOptions(toast);
  const root = document.createElement("div");
  const title = document.createElement("strong");
  const body = document.createElement("p");
  const actions = document.createElement("div");
  const manualButton = document.createElement("button");
  const dismissButton = document.createElement("button");

  root.id = AUTO_BOOSTER_FALLBACK_TOAST_ID;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-live", "polite");
  root.hidden = true;
  Object.assign(root.style, fallbackToastRootStyle);

  title.textContent = getI18nMessageSafe("autoBoosterFallbackToastTitle");
  Object.assign(title.style, fallbackToastTitleStyle);

  body.dataset.role = "body";
  Object.assign(body.style, fallbackToastBodyStyle);

  Object.assign(actions.style, fallbackToastActionsStyle);

  manualButton.type = "button";
  manualButton.textContent = getI18nMessageSafe("autoBoosterFallbackToastManualAction");
  stylePrimaryFallbackToastButton(manualButton);
  manualButton.onclick = options.onManualFallback;

  dismissButton.type = "button";
  dismissButton.textContent = getI18nMessageSafe("autoBoosterFallbackToastDismissAction");
  styleSecondaryFallbackToastButton(dismissButton);
  dismissButton.onclick = options.onDismiss;

  actions.appendChild(manualButton);
  actions.appendChild(dismissButton);
  root.appendChild(title);
  root.appendChild(body);
  root.appendChild(actions);
  document.documentElement.appendChild(root);

  toast.root = root;
  toast.body = body;
  return root;
}
