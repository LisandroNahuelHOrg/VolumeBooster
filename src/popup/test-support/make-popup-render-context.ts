import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../shared/audio-settings";
import type { UiCatalog } from "../../shared/runtime-i18n";
import type { PopupRenderContext } from "../internal/render/popup-render-types";

export function makePopupRenderContext(
  catalog: UiCatalog,
  overrides: Partial<PopupRenderContext> = {}
): PopupRenderContext {
  return {
    catalog,
    loadedLocale: "en",
    popupTheme: "dark",
    currentView: "main",
    draftGainPercent: 100,
    draftAdvancedAudioSettings: null,
    pendingAdvancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
    transientError: null,
    ...overrides
  };
}
