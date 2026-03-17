import type {
  AdvancedAudioSettings,
  LocalizedMessage,
  PopupTheme
} from "../../../shared/types";
import type { UiCatalog } from "../../../shared/runtime-i18n";
import type { PopupView } from "../../popup-ui-state-types";
import type { PopupRenderContext } from "./popup-render-types";

export function createPopupRenderContext(args: {
  catalog: UiCatalog | null;
  loadedLocale: string | null;
  popupTheme: PopupTheme;
  currentView: PopupView;
  isLifetimePremiumActive: boolean;
  draftGainPercent: number;
  draftAdvancedAudioSettings: AdvancedAudioSettings | null;
  pendingAdvancedAudioSettings: AdvancedAudioSettings | null;
  premiumEmailDraft: string;
  premiumLicenseDraft: string;
  transientError: LocalizedMessage | null;
}): PopupRenderContext {
  return {
    catalog: args.catalog,
    loadedLocale: args.loadedLocale,
    popupTheme: args.popupTheme,
    currentView: args.currentView,
    isLifetimePremiumActive: args.isLifetimePremiumActive,
    draftGainPercent: args.draftGainPercent,
    draftAdvancedAudioSettings: args.draftAdvancedAudioSettings,
    pendingAdvancedAudioSettings: args.pendingAdvancedAudioSettings,
    premiumEmailDraft: args.premiumEmailDraft,
    premiumLicenseDraft: args.premiumLicenseDraft,
    transientError: args.transientError
  };
}
