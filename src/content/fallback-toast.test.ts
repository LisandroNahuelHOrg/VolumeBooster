// @vitest-environment happy-dom

import { AUTO_BOOSTER_FALLBACK_TOAST_ID } from "../shared/constants";
import { UI_FONT_STYLE_ID } from "../shared/ui-font-stack";
import { AutoFallbackToast } from "./fallback-toast";

describe("AutoFallbackToast", () => {
  const i18nGetMessage = vi.fn();

  beforeEach(() => {
    i18nGetMessage.mockReset().mockImplementation((key: string) => {
      const dictionary: Record<string, string> = {
        autoBoosterFallbackToastTitle: "Automatic boosting could not finish on this page.",
        autoBoosterFallbackToastBody:
          "This page did not expose a hookable audio path. Switch to the manual lane for the most reliable result.",
        autoBoosterFallbackToastPermissionBody:
          "This page blocked the automatic booster runtime. You can still boost this tab with the manual lane.",
        autoBoosterFallbackToastManualAction: "Switch to manual mode",
        autoBoosterFallbackToastDismissAction: "Dismiss",
        errorAutoAttachFailed: "The automatic site booster could not hook this page."
      };
      return dictionary[key] ?? "";
    });

    vi.stubGlobal(
      "chrome",
      {
        i18n: {
          getMessage: i18nGetMessage
        },
        runtime: {
          getURL: vi.fn((path: string) => `chrome-extension://id/${path}`)
        }
      } as unknown as typeof chrome
    );
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("renders a persistent top-right toast with manual and dismiss actions", () => {
    const onManualFallback = vi.fn();
    const onDismiss = vi.fn();
    const toast = new AutoFallbackToast({ onManualFallback, onDismiss });

    toast.show({
      tabId: 7,
      reason: "attach_failed"
    });

    const root = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement | null;
    expect(root).not.toBeNull();
    expect(root?.hidden).toBe(false);
    expect(root?.style.top).toBe("16px");
    expect(root?.style.right).toBe("16px");
    expect(root?.style.zIndex).toBe("2147483647");

    const buttons = [...(root?.querySelectorAll("button") ?? [])] as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent)).toEqual(["Switch to manual mode", "Dismiss"]);
    expect(buttons[0]?.style.appearance).toBe("none");
    expect(buttons[0]?.style.border).toContain("none");
    expect(buttons[0]?.style.borderRadius).toBe("999px");
    expect(buttons[0]?.style.padding).toBe("10px 14px");
    expect(buttons[0]?.style.cursor).toBe("pointer");
    expect(buttons[1]?.style.appearance).toBe("none");
    expect(buttons[1]?.style.borderRadius).toBe("999px");
    expect(buttons[1]?.style.padding).toBe("10px 14px");
    expect(buttons[1]?.style.cursor).toBe("pointer");

    buttons[0]?.click();
    buttons[1]?.click();

    expect(onManualFallback).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(toast.isVisible()).toBe(true);
  });

  it("hides and destroys the toast on demand", () => {
    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 7,
      reason: "permission_missing"
    });
    expect(toast.isVisible()).toBe(true);

    toast.hide();
    expect(toast.isVisible()).toBe(false);

    toast.destroy();
    expect(document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID)).toBeNull();
  });

  it("uses error copy for structured errors and falls back to generated English when i18n is empty", () => {
    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 7,
      reason: "attach_failed",
      errorMessage: { key: "errorAutoAttachFailed" }
    });

    const body = document.querySelector<HTMLParagraphElement>(`#${AUTO_BOOSTER_FALLBACK_TOAST_ID} [data-role='body']`);
    expect(body?.textContent).toBe("The automatic site booster could not hook this page.");

    i18nGetMessage.mockReturnValue("");

    toast.show({
      tabId: 7,
      reason: "attach_failed",
      errorMessage: { key: "errorAutoAttachFailed" }
    });

    expect(body?.textContent).toBe("The automatic site booster could not hook this page.");
  });

  it("uses the default attach-failed body copy and resolves structured substitutions through i18n", () => {
    i18nGetMessage.mockImplementation((key: string, substitutions?: string[]) => {
      if (key === "errorAutoNamed" && substitutions) {
        return substitutions.join(" :: ");
      }

      const dictionary: Record<string, string> = {
        autoBoosterFallbackToastTitle: "Automatic boosting could not finish on this page.",
        autoBoosterFallbackToastBody:
          "This page did not expose a hookable audio path. Switch to the manual lane for the most reliable result.",
        autoBoosterFallbackToastPermissionBody:
          "This page blocked the automatic booster runtime. You can still boost this tab with the manual lane.",
        autoBoosterFallbackToastManualAction: "Switch to manual mode",
        autoBoosterFallbackToastDismissAction: "Dismiss"
      };

      return dictionary[key] ?? "";
    });

    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 7,
      reason: "attach_failed"
    });

    const body = document.querySelector<HTMLParagraphElement>(`#${AUTO_BOOSTER_FALLBACK_TOAST_ID} [data-role='body']`);
    expect(body?.textContent).toBe(
      "This page did not expose a hookable audio path. Switch to the manual lane for the most reliable result."
    );

    toast.show({
      tabId: 7,
      reason: "attach_failed",
      errorMessage:
        ({
          key: "errorAutoNamed",
          substitutions: {
            site: "YouTube",
            lane: "manual"
          }
        } as never)
    });

    expect(body?.textContent).toBe("YouTube :: manual");
    expect(i18nGetMessage).toHaveBeenCalledWith("errorAutoNamed", ["YouTube", "manual"]);
  });

  it("uses customized i18n strings for title, actions, and permission copy when they differ from the literal fallbacks", () => {
    i18nGetMessage.mockImplementation((key: string) => {
      const dictionary: Record<string, string> = {
        autoBoosterFallbackToastTitle: "Custom title",
        autoBoosterFallbackToastPermissionBody: "Custom permission body",
        autoBoosterFallbackToastManualAction: "Custom manual",
        autoBoosterFallbackToastDismissAction: "Custom dismiss"
      };

      return dictionary[key] ?? "";
    });
    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 14,
      reason: "permission_missing"
    });

    const root = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement;
    const title = root.querySelector("strong");
    const body = root.querySelector<HTMLParagraphElement>("[data-role='body']");
    const buttons = [...root.querySelectorAll("button")] as HTMLButtonElement[];

    expect(title?.textContent).toBe("Custom title");
    expect(body?.textContent).toBe("Custom permission body");
    expect(buttons.map((button) => button.textContent)).toEqual(["Custom manual", "Custom dismiss"]);
  });

  it("uses exact fallback strings and root styling when i18n returns empty values", () => {
    i18nGetMessage.mockReturnValue("");
    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 9,
      reason: "permission_missing"
    });

    const root = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement | null;
    const title = root?.querySelector("strong");
    const body = root?.querySelector<HTMLParagraphElement>("[data-role='body']");
    const buttons = [...(root?.querySelectorAll("button") ?? [])] as HTMLButtonElement[];

    expect(root?.getAttribute("role")).toBe("dialog");
    expect(root?.getAttribute("aria-live")).toBe("polite");
    expect(root?.dataset.mode).toBe("prompt");
    expect(root?.style.position).toBe("fixed");
    expect(root?.style.padding).toBe("16px");
    expect(root?.style.borderRadius).toBe("16px");
    expect(root?.style.background).toBe("rgba(15, 22, 31, 0.96)");
    expect(root?.style.border).toBe("1px solid rgba(255, 177, 64, 0.36)");
    expect(root?.style.boxShadow).toBe("0 24px 60px rgba(0, 0, 0, 0.32)");
    expect(root?.style.color).toBe("#f7f3ed");
    expect(root?.style.fontFamily).toContain("Montserrat");
    expect(document.getElementById(UI_FONT_STYLE_ID)?.textContent).toContain("chrome-extension://id/assets/montserrat-latin.woff2");
    expect(title?.textContent).toBe("Automatic boosting could not finish on this page.");
    expect(title?.style.display).toBe("block");
    expect(title?.style.marginBottom).toBe("8px");
    expect(title?.style.fontSize).toBe("14px");
    expect(body?.textContent).toBe(
      "This page blocked the automatic booster runtime. You can still boost this tab with the manual lane."
    );
    expect(body?.style.margin).toBe("0px");
    expect(body?.style.fontSize).toBe("13px");
    expect(body?.style.lineHeight).toBe("1.45");
    expect(buttons.map((button) => button.type)).toEqual(["button", "button"]);
    expect(buttons.map((button) => button.textContent)).toEqual(["Switch to manual mode", "Dismiss"]);
    expect(buttons[0]?.style.background).toBe("#f7b04c");
    expect(buttons[0]?.style.color).toBe("#11161e");
    expect(buttons[0]?.style.fontWeight).toBe("700");
    expect(buttons[1]?.style.background).toBe("transparent");
    expect(buttons[1]?.style.border).toBe("1px solid rgba(255, 255, 255, 0.18)");
    expect(buttons[1]?.style.color).toBe("#f7f3ed");
    expect(buttons[1]?.style.fontWeight).toBe("600");
  });

  it("reuses the connected root, keeps error mode for structured errors, and ignores non-top frames", () => {
    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 11,
      reason: "attach_failed",
      errorMessage: {
        key: "errorAutoAttachFailed",
        substitutions: {
          name: "Tab"
        }
      }
    });

    const firstRoot = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement | null;
    const firstBody = firstRoot?.querySelector<HTMLParagraphElement>("[data-role='body']");
    expect(firstRoot?.dataset.mode).toBe("error");
    expect(firstBody?.textContent).toBe("The automatic site booster could not hook this page.");

    toast.hide();
    toast.show({
      tabId: 11,
      reason: "attach_failed"
    });
    const secondRoot = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement | null;
    expect(secondRoot).toBe(firstRoot);
    expect(secondRoot?.dataset.mode).toBe("prompt");

    Object.defineProperty(window, "top", {
      configurable: true,
      value: {}
    });
    toast.show({
      tabId: 12,
      reason: "permission_missing"
    });
    expect(document.querySelectorAll(`#${AUTO_BOOSTER_FALLBACK_TOAST_ID}`)).toHaveLength(1);
  });

  it("does not create a toast in non-top frames before the first render", () => {
    Object.defineProperty(window, "top", {
      configurable: true,
      value: {}
    });
    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 15,
      reason: "attach_failed"
    });

    expect(document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID)).toBeNull();
    expect(toast.isVisible()).toBe(false);
  });

  it("keeps the toast hidden when the root loses its body node and show cannot recover it", () => {
    Object.defineProperty(window, "top", {
      configurable: true,
      value: window
    });
    Object.defineProperty(window, "self", {
      configurable: true,
      value: window
    });
    const toast = new AutoFallbackToast({
      onManualFallback: vi.fn(),
      onDismiss: vi.fn()
    });

    toast.show({
      tabId: 13,
      reason: "attach_failed"
    });

    const root = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement;
    toast.hide();
    root.querySelector("[data-role='body']")?.remove();
    (
      toast as unknown as {
        body: HTMLParagraphElement | null;
      }
    ).body = null;

    toast.show({
      tabId: 13,
      reason: "permission_missing"
    });

    expect(root.hidden).toBe(true);
    expect(toast.isVisible()).toBe(false);
  });

  it("recreates the toast after destroy and keeps actions functional", () => {
    const onManualFallback = vi.fn();
    const onDismiss = vi.fn();
    const toast = new AutoFallbackToast({ onManualFallback, onDismiss });

    toast.show({
      tabId: 16,
      reason: "attach_failed"
    });

    const firstRoot = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement | null;
    expect(firstRoot).not.toBeNull();

    toast.destroy();
    expect(document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID)).toBeNull();

    toast.show({
      tabId: 16,
      reason: "permission_missing"
    });

    const secondRoot = document.getElementById(AUTO_BOOSTER_FALLBACK_TOAST_ID) as HTMLDivElement | null;
    const buttons = [...(secondRoot?.querySelectorAll("button") ?? [])] as HTMLButtonElement[];

    expect(secondRoot).not.toBeNull();
    expect(secondRoot).not.toBe(firstRoot);
    expect(secondRoot?.hidden).toBe(false);

    buttons[0]?.click();
    buttons[1]?.click();

    expect(onManualFallback).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
