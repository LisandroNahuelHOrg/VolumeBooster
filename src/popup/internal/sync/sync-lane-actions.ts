import type { PopupDynamicUiModel } from "./popup-dynamic-ui-types";

export function syncLaneActions(rootElement: HTMLElement, model: PopupDynamicUiModel): HTMLElement[] {
  const animations: HTMLElement[] = [];
  const siteAutoButton = rootElement.querySelector<HTMLButtonElement>("[data-role='toggle-site-auto']");
  const globalAutoButton = rootElement.querySelector<HTMLButtonElement>("[data-role='toggle-global-auto']");

  if (siteAutoButton) {
    const previousSiteAutoEnabled = siteAutoButton.classList.contains("is-active");
    const siteAutoAction = siteAutoButton.querySelector<HTMLElement>("[data-role='toggle-site-auto-action']");
    const siteAutoMode = siteAutoButton.querySelector<HTMLElement>("[data-role='toggle-site-auto-mode']");
    const previousSiteLabel = `${siteAutoAction?.textContent ?? ""}|${siteAutoMode?.textContent ?? ""}`;
    siteAutoButton.dataset.action = model.renderModel.siteAutoEnabled ? "disable-site-auto" : "enable-site-auto";
    siteAutoButton.disabled = !Boolean(model.renderModel.currentTab?.supported);
    siteAutoButton.classList.toggle("is-active", model.renderModel.siteAutoEnabled);
    if (siteAutoAction) {
      siteAutoAction.textContent = model.renderModel.siteLaneButtonCopy.action;
    }
    if (siteAutoMode) {
      siteAutoMode.textContent = model.renderModel.siteLaneButtonCopy.mode;
    }
    if (
      previousSiteAutoEnabled !== model.renderModel.siteAutoEnabled ||
      previousSiteLabel !==
        `${model.renderModel.siteLaneButtonCopy.action}|${model.renderModel.siteLaneButtonCopy.mode}`
    ) {
      animations.push(siteAutoButton);
    }
  }

  if (globalAutoButton) {
    const previousGlobalAutoEnabled = globalAutoButton.classList.contains("is-active");
    const globalAutoAction =
      globalAutoButton.querySelector<HTMLElement>("[data-role='toggle-global-auto-action']");
    const globalAutoMode =
      globalAutoButton.querySelector<HTMLElement>("[data-role='toggle-global-auto-mode']");
    const previousGlobalLabel = `${globalAutoAction?.textContent ?? ""}|${globalAutoMode?.textContent ?? ""}`;
    globalAutoButton.dataset.action = model.renderModel.globalAutoAction;
    globalAutoButton.disabled = !Boolean(model.renderModel.currentTab);
    globalAutoButton.classList.toggle("is-active", model.renderModel.globalAutoEnabled);
    if (globalAutoAction) {
      globalAutoAction.textContent = model.renderModel.globalLaneButtonCopy.action;
    }
    if (globalAutoMode) {
      globalAutoMode.textContent = model.renderModel.globalLaneButtonCopy.mode;
    }
    if (
      previousGlobalAutoEnabled !== model.renderModel.globalAutoEnabled ||
      previousGlobalLabel !==
        `${model.renderModel.globalLaneButtonCopy.action}|${model.renderModel.globalLaneButtonCopy.mode}`
    ) {
      animations.push(globalAutoButton);
    }
  }

  return animations;
}
