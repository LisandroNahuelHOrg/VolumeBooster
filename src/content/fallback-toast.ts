/**
 * @fileoverview Persistent top-frame toast used to fall back from automatic
 * global mode to the robust manual lane.
 */
import { AUTO_BOOSTER_FALLBACK_TOAST_ID } from "../shared/constants";
import type { AutoFallbackToastCommandPayload, LocalizedMessage } from "../shared/types";
import { getI18nMessageSafe } from "./runtime-api";

interface AutoFallbackToastOptions {
  onManualFallback: () => void;
  onDismiss: () => void;
}

/**
 * Manages the lifecycle of the in-page fallback toast shown in the top frame.
 */
export class AutoFallbackToast {
  private root: HTMLDivElement | null = null;
  private body: HTMLParagraphElement | null = null;

  constructor(private readonly options: AutoFallbackToastOptions) {}

  show(payload: AutoFallbackToastCommandPayload): void {
    if (window.top !== window.self) {
      return;
    }

    const root = this.ensureRoot();
    const body = this.body ?? root.querySelector<HTMLParagraphElement>("[data-role='body']");

    if (!body) {
      return;
    }

    this.body = body;
    body.textContent = this.resolveBodyCopy(payload.reason, payload.errorMessage);
    root.hidden = false;
    root.dataset.mode = payload.errorMessage ? "error" : "prompt";
  }

  hide(): void {
    if (this.root) {
      this.root.hidden = true;
    }
  }

  isVisible(): boolean {
    return Boolean(this.root && !this.root.hidden);
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
    this.body = null;
  }

  private ensureRoot(): HTMLDivElement {
    if (this.root?.isConnected) {
      return this.root;
    }

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
    Object.assign(root.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: "2147483647",
      width: "min(360px, calc(100vw - 24px))",
      padding: "16px",
      borderRadius: "16px",
      background: "rgba(15, 22, 31, 0.96)",
      border: "1px solid rgba(255, 177, 64, 0.36)",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.32)",
      color: "#f7f3ed",
      fontFamily: "\"Segoe UI\", sans-serif"
    } satisfies Partial<CSSStyleDeclaration>);

    title.textContent =
      getI18nMessageSafe("autoBoosterFallbackToastTitle") ||
      "Automatic boosting could not finish on this page.";
    title.style.display = "block";
    title.style.marginBottom = "8px";
    title.style.fontSize = "14px";

    body.dataset.role = "body";
    body.style.margin = "0";
    body.style.fontSize = "13px";
    body.style.lineHeight = "1.45";

    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.marginTop = "14px";

    manualButton.type = "button";
    manualButton.textContent =
      getI18nMessageSafe("autoBoosterFallbackToastManualAction") || "Switch to manual mode";
    stylePrimaryButton(manualButton);
    manualButton.addEventListener("click", () => {
      this.options.onManualFallback();
    });

    dismissButton.type = "button";
    dismissButton.textContent =
      getI18nMessageSafe("autoBoosterFallbackToastDismissAction") || "Dismiss";
    styleSecondaryButton(dismissButton);
    dismissButton.addEventListener("click", () => {
      this.options.onDismiss();
    });

    actions.appendChild(manualButton);
    actions.appendChild(dismissButton);
    root.appendChild(title);
    root.appendChild(body);
    root.appendChild(actions);
    document.documentElement.appendChild(root);

    this.root = root;
    this.body = body;
    return root;
  }

  private resolveBodyCopy(reason: AutoFallbackToastCommandPayload["reason"], errorMessage?: LocalizedMessage): string {
    if (errorMessage) {
      return localizeMessage(errorMessage);
    }

    if (reason === "permission_missing") {
      return (
        getI18nMessageSafe("autoBoosterFallbackToastPermissionBody") ||
        "This page blocked the automatic booster runtime. You can still boost this tab with the manual lane."
      );
    }

    return (
      getI18nMessageSafe("autoBoosterFallbackToastBody") ||
      "This page did not expose a hookable audio path. Switch to the manual lane for the most reliable result."
    );
  }
}

function localizeMessage(messageValue: LocalizedMessage): string {
  const substitutions = messageValue.substitutions
    ? Object.values(messageValue.substitutions).map((value) => String(value))
    : undefined;
  return getI18nMessageSafe(messageValue.key, substitutions) || messageValue.key;
}

function stylePrimaryButton(button: HTMLButtonElement): void {
  Object.assign(button.style, {
    appearance: "none",
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    background: "#f7b04c",
    color: "#11161e",
    fontWeight: "700",
    cursor: "pointer"
  } satisfies Partial<CSSStyleDeclaration>);
}

function styleSecondaryButton(button: HTMLButtonElement): void {
  Object.assign(button.style, {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "999px",
    padding: "10px 14px",
    background: "transparent",
    color: "#f7f3ed",
    fontWeight: "600",
    cursor: "pointer"
  } satisfies Partial<CSSStyleDeclaration>);
}
