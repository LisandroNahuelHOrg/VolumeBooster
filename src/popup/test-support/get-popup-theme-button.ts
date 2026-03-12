export function getPopupThemeButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>("[data-action='toggle-popup-theme']");

  if (!button) {
    throw new Error("PopupThemeButtonMissing");
  }

  return button;
}
