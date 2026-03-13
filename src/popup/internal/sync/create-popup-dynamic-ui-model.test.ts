import { expect, test } from "vitest";
import { buildPopupViewModel } from "../../model";
import { loadLocaleCatalog, translate } from "../../../shared/runtime-i18n";
import { makePopupMainSession } from "../../test-support/make-popup-main-session";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { makePopupRenderContext } from "../../test-support/make-popup-render-context";
import { createPopupDynamicUiModel } from "./create-popup-dynamic-ui-model";

test("derives stable sync data for lane buttons, live meter, and session cards", async () => {
  const catalog = await loadLocaleCatalog("en");
  const state = makePopupMainState({
    currentTab: {
      tabId: 91,
      title: "Focus Stream",
      url: "https://example.com/watch",
      domain: "example.com",
      supported: true,
      preferredGainPercent: 175,
      hasStoredPreference: false,
      activeLane: "manual_tab_capture",
      autoAttachState: "idle"
    },
    hasGlobalPermission: false,
    sessions: [
      makePopupMainSession({
        tabId: 91,
        warning: "danger",
        clipEvents: 2,
        clipPeak: 1.1,
        protectorActionDb: 3.2,
        gainPercent: 220
      })
    ]
  });
  const model = createPopupDynamicUiModel({
    viewModel: buildPopupViewModel(state),
    renderContext: makePopupRenderContext(catalog, { draftGainPercent: 220 }),
    sessionBoostAcknowledgedAction: null,
    sessionCarouselOffset: 0
  });

  expect(model.meterValueText).not.toBe("0%");
  expect(model.renderModel.globalAutoAction).toBe("request-global-auto-permission");
  expect(model.renderModel.globalLaneButtonCopy.action).not.toBe("");
  expect(model.warningText).toBe(translate(catalog, "warningDanger"));
  expect(model.sessionCards[0]).toMatchObject({
    tabId: 91,
    gainText: "220%",
    clipEventsText: "2",
    warningTone: "danger"
  });
  expect(model.sessionCards[0]?.statusText).not.toBe("");
});
