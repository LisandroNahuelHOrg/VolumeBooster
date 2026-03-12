export function getPopupSessionMeterFill(): HTMLElement {
  const meterFill = document.querySelector<HTMLElement>("[data-role='session-meter-fill']");

  if (!meterFill) {
    throw new Error("PopupSessionMeterFillMissing");
  }

  return meterFill;
}
