import { fallbackToastSecondaryButtonStyle } from "./fallback-toast-style-data";

export function styleSecondaryFallbackToastButton(button: HTMLButtonElement): void {
  Object.assign(button.style, fallbackToastSecondaryButtonStyle);
}
