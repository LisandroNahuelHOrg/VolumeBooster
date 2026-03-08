// @vitest-environment happy-dom

import { AUTO_BOOSTER_FALLBACK_TOAST_ID } from "../shared/constants";
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
        errorAutoAttachFailed: "Automatic boosting failed."
      };
      return dictionary[key] ?? "";
    });

    vi.stubGlobal(
      "chrome",
      {
        i18n: {
          getMessage: i18nGetMessage
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

  it("uses error copy when the worker passes a structured error message", () => {
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
    expect(body?.textContent).toBe("Automatic boosting failed.");
  });
});
