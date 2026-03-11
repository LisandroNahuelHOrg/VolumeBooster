import { fallbackToastPrimaryButtonStyle } from "./fallback-toast-style-data";

export function stylePrimaryFallbackToastButton(button: HTMLButtonElement): void {
  Object.assign(button.style, fallbackToastPrimaryButtonStyle);
}
