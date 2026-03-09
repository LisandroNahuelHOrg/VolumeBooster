/**
 * @fileoverview Renderiza y sincroniza el popup principal de la extensión,
 * incluyendo controles de boost, modo global, métricas, tooltips e i18n.
 */
import "./popup.css";

import {
  QUALITY_PRESET_ORDER,
  QUALITY_PROTECTOR_MODE_ORDER,
  applyQualityPreset,
  deriveClippingSafetyMarginDb,
  deriveProtectionLoadPercent,
  sanitizeAdvancedAudioSettings
} from "../shared/audio-settings";
import {
  DEFAULT_GAIN_PERCENT,
  MAX_GAIN_PERCENT,
  MIN_GAIN_PERCENT,
  POPUP_LANE_TRANSITION_FROM,
  POPUP_LANE_TRANSITION_TO,
  POPUP_PREMIUM_EASING,
  REDUCED_MOTION_MEDIA_QUERY
} from "../shared/constants";
import { getDuckDuckGoFaviconUrl } from "../shared/domain";
import { clampGainPercent, deriveWarning } from "../shared/gain";
import { message, sendMessageSafe } from "../shared/messages";
import {
  formatLocalizedMessage,
  getBrowserLocale,
  loadLocaleCatalog,
  setDocumentLocaleAttributes,
  t,
  tp,
  translate,
  type UiCatalog
} from "../shared/runtime-i18n";
import { ensureExtensionUiFontFaces } from "../shared/ui-font-extension";
import type {
  AdvancedAudioSettings,
  AudioQualityProtectorMode,
  CaptureSessionState,
  LevelUpdatePayload,
  LocalizedMessage,
  QualityPreset,
  RuntimeResponse,
  SessionStatusPayload,
  WorkerState
} from "../shared/types";
import { buildPopupViewModel } from "./model";
import {
  getQualityPresetCopy,
  getQualityPresetSubtitleCopy
} from "./quality-preset-copy";
import {
  getQualityProtectorButtonCopy,
  getQualityProtectorModeCopy,
  getQualityProtectorSubtitleCopy
} from "./quality-protector-copy";
import { getRecoverableGlobalAutoTabId } from "./global-auto-permission";
import {
  buildSessionCarouselModel,
  shiftSessionCarouselOffset
} from "./session-carousel";
import { getLaneButtonCopy, type LaneButtonCopyKind } from "./lane-button-copy";
import { deriveLiveActivityPercent } from "./live-activity";

const PRESET_VALUES = [
  100, 125, 150, 175, 200,
  250, 300, 350, 400, 450,
  500, 600, 700, 800, 1000,
  2000, 3000, 4000, 5000, 10000
];
const QUALITY_PROTECTOR_VALUES: AudioQualityProtectorMode[] = [...QUALITY_PROTECTOR_MODE_ORDER];
const ADVANCED_PRESET_VALUES: Array<Exclude<QualityPreset, "custom">> = QUALITY_PRESET_ORDER.filter(
  (preset): preset is Exclude<QualityPreset, "custom"> => preset !== "custom"
);
const GAIN_COMMIT_DEBOUNCE_MS = 60;
const GAIN_PRESET_ANIMATION_MS = 280;
const GAIN_TRACK_JUMP_WINDOW_MS = 250;
const GAIN_TRACK_DRAG_THRESHOLD_PX = 6;
const ADVANCED_COMMIT_DEBOUNCE_MS = 80;
const LANE_LAYOUT_TRANSITION_MS = 240;
const STATE_POLL_MS = 180;
const PROTECTOR_TELEMETRY_UI_MS = 80;
type AdvancedControlKey = keyof Pick<
  AdvancedAudioSettings,
  "ceilingDb" | "lookaheadMs" | "releaseMs" | "multibandDepth" | "softClipMix"
>;
type LaneStatusTone = "idle" | "manual" | "automatic" | "watching" | "failed" | "unsupported";

interface LaneStatusDescriptor {
  tone: LaneStatusTone;
  badge: string;
  title: string;
  detail: string;
}

interface GainVisualSyncOptions {
  animateVisuals?: boolean;
}

const LANE_BUTTON_ICON_MARKUP: Record<LaneButtonCopyKind, string> = {
  "current-tab": `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M15 20H9M4 13.8002V8.2002C4 7.08009 4 6.51962 4.21799 6.0918C4.40973 5.71547 4.71547 5.40973 5.0918 5.21799C5.51962 5 6.08009 5 7.2002 5H16.8002C17.9203 5 18.4796 5 18.9074 5.21799C19.2837 5.40973 19.5905 5.71547 19.7822 6.0918C20 6.5192 20 7.07899 20 8.19691V13.8031C20 14.921 20 15.48 19.7822 15.9074C19.5905 16.2837 19.2837 16.5905 18.9074 16.7822C18.48 17 17.921 17 16.8031 17H7.19691C6.07899 17 5.5192 17 5.0918 16.7822C4.71547 16.5905 4.40973 16.2837 4.21799 15.9074C4 15.4796 4 14.9203 4 13.8002ZM14.5 11L10 8V14L14.5 11Z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  "all-sites": `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 12H8M3 12C3 16.9706 7.02944 21 12 21M3 12C3 7.02944 7.02944 3 12 3M8 12H16M8 12C8 16.9706 9.79086 21 12 21M8 12C8 7.02944 9.79086 3 12 3M16 12H21M16 12C16 7.02944 14.2091 3 12 3M16 12C16 16.9706 14.2091 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12C21 16.9706 16.9706 21 12 21"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `
};

const ADVANCED_CONTROL_CONFIG: Record<
  AdvancedControlKey,
  {
    min: number;
    max: number;
    step: number;
    labelKey: string;
    helpLabelKey: string;
    helpTextKey: string;
    format: (value: number) => string;
  }
> = {
  ceilingDb: {
    min: -2,
    max: -0.3,
    step: 0.01,
    labelKey: "ceilingLabel",
    helpLabelKey: "ceilingHelpLabel",
    helpTextKey: "ceilingHelpText",
    format: (value) => `${value.toFixed(2)} dB`
  },
  lookaheadMs: {
    min: 1,
    max: 8,
    step: 0.1,
    labelKey: "lookaheadLabel",
    helpLabelKey: "lookaheadHelpLabel",
    helpTextKey: "lookaheadHelpText",
    format: (value) => `${value.toFixed(1)} ms`
  },
  releaseMs: {
    min: 60,
    max: 350,
    step: 1,
    labelKey: "releaseLabel",
    helpLabelKey: "releaseHelpLabel",
    helpTextKey: "releaseHelpText",
    format: (value) => `${Math.round(value)} ms`
  },
  multibandDepth: {
    min: 0,
    max: 100,
    step: 1,
    labelKey: "multibandDepthLabel",
    helpLabelKey: "multibandDepthHelpLabel",
    helpTextKey: "multibandDepthHelpText",
    format: (value) => `${Math.round(value)}%`
  },
  softClipMix: {
    min: 0,
    max: 40,
    step: 0.1,
    labelKey: "softClipMixLabel",
    helpLabelKey: "softClipMixHelpLabel",
    helpTextKey: "softClipMixHelpText",
    format: (value) => `${value.toFixed(1)}%`
  }
};
const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Popup root container was not found.");
}

const rootElement = appRoot;

syncPopupViewportHeight();
window.addEventListener("resize", syncPopupViewportHeight);

let currentState: WorkerState | null = null;
let currentCatalog: UiCatalog | null = null;
let loadedLocale: string | null = null;
let draftGainPercent = DEFAULT_GAIN_PERCENT;
let visualGainPercent = DEFAULT_GAIN_PERCENT;
let transientError: LocalizedMessage | null = null;
let renderedSignature = "";
let pendingGainTrackJumpAnimationAt = 0;
let pendingGainTrackJumpPointerId: number | null = null;
let pendingGainTrackJumpStartX: number | null = null;
let pendingGainTrackJumpMoved = false;
let gainCommitTimer: number | null = null;
let gainCommitInFlight = false;
let gainSliderAnimationFrame: number | null = null;
let gainSliderAnimationTarget: number | null = null;
let pendingGainPercent: number | null = null;
let isAdjustingGain = false;
let draftAdvancedAudioSettings: AdvancedAudioSettings | null = null;
let pendingAdvancedAudioSettings: AdvancedAudioSettings | null = null;
let advancedCommitTimer: number | null = null;
let advancedCommitInFlight = false;
let isAdjustingAdvancedSettings = false;
let rootEventsBound = false;
let statePollTimer: number | null = null;
let lastBoosterButtonMode: "active" | "idle" | "disabled" | null = null;
let boosterButtonMorphTimer: number | null = null;
let lastProtectorTelemetryUiAt = 0;
let lastProtectorTelemetryDisplayKey = "";
let lastLaneStatusDisplayKey = "";
let laneLayoutTransitionTimer: number | null = null;
let tooltipRefreshFrame: number | null = null;
let activeHelpTooltipAnchor: HTMLElement | null = null;
let sessionCarouselOffset = 0;

void bootstrap();

function syncPopupViewportHeight(): void {
  const viewportHeight = Math.max(1, Math.min(800, window.innerHeight || 800));
  document.documentElement.style.setProperty("--popup-viewport-height", `${viewportHeight}px`);
}

async function bootstrap(): Promise<void> {
  bindRootEvents();
  startStatePolling();
  ensureExtensionUiFontFaces(document);
  setDocumentLocaleAttributes(document);
  document.title = t("popupDocumentTitle");
  currentCatalog = await loadLocaleCatalog();
  loadedLocale = getBrowserLocale();
  ensureFloatingHelpTooltip();

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return;
    }

    const typedMessage = message as { type: string; payload?: unknown };

    if (typedMessage.type === "WORKER_STATE_UPDATE" && typedMessage.payload) {
      void applyState(typedMessage.payload as WorkerState);
      return;
    }

    if (typedMessage.type === "SESSION_LEVEL_UPDATE" && typedMessage.payload) {
      if (applyLevelUpdate(typedMessage.payload as LevelUpdatePayload)) {
        syncCurrentViewModel();
      }
      return;
    }

    if (typedMessage.type === "SESSION_STATUS_UPDATE" && typedMessage.payload) {
      if (applySessionStatusUpdate(typedMessage.payload as SessionStatusPayload)) {
        syncCurrentViewModel();
      }
      return;
    }

    if (typedMessage.type === "WORKER_ERROR" && typedMessage.payload) {
      transientError = (typedMessage.payload as { message: LocalizedMessage }).message;
      render();
    }
  });

  const response = await sendMessageSafe<WorkerState>({ type: "GET_STATE" });

  if (!response.ok || !response.data) {
    transientError = response.errorMessage ?? message("errorGetState");
    render();
    return;
  }

  await applyState(response.data);
}

function startStatePolling(): void {
  if (statePollTimer !== null) {
    return;
  }

  statePollTimer = window.setInterval(() => {
    void refreshStateSilently();
  }, STATE_POLL_MS);
}

/**
 * Recupera estado periódico del worker sin interrumpir la interacción actual
 * del popup.
 */
async function refreshStateSilently(): Promise<void> {
  const response = await sendMessageSafe<WorkerState>({ type: "GET_STATE" });

  if (!response.ok || !response.data) {
    return;
  }

  await applyState(response.data);
}

/**
 * Aplica el nuevo estado del worker y decide qué partes del view model deben
 * refrescarse o preservarse.
 */
async function applyState(nextState: WorkerState): Promise<void> {
  const previousState = currentState;
  currentState = nextState;
  const autoLocale = getBrowserLocale();

  if (!currentCatalog || loadedLocale !== autoLocale) {
    setDocumentLocaleAttributes(document, autoLocale);
    document.title = t("popupDocumentTitle");
    currentCatalog = await loadLocaleCatalog(autoLocale);
    loadedLocale = autoLocale;
    renderedSignature = "";
  }

  const viewModel = buildPopupViewModel(nextState);
  const actualGain = viewModel.gainPercent;
  const tabContextChanged = didTabContextChange(previousState, nextState);

  if (pendingGainPercent !== null) {
    if (!viewModel.currentSession || actualGain === pendingGainPercent) {
      pendingGainPercent = null;
    }
  }

  if (!isAdjustingGain && pendingGainPercent === null && (previousState === null || tabContextChanged || viewModel.currentSession)) {
    draftGainPercent = actualGain;
  }

  if (
    pendingAdvancedAudioSettings &&
    areAdvancedSettingsEqual(pendingAdvancedAudioSettings, nextState.advancedAudioSettings)
  ) {
    pendingAdvancedAudioSettings = null;
  }

  if (!isAdjustingAdvancedSettings && pendingAdvancedAudioSettings === null) {
    draftAdvancedAudioSettings = { ...nextState.advancedAudioSettings };
  }

  render();
}

/**
 * Re-renderiza el popup cuando cambió la firma visual base y sincroniza los
 * fragmentos dinámicos en caliente.
 */
function render(): void {
  let shouldRestoreUiState = false;
  let preservedScrollTop = 0;
  let preservedFocusedAdvancedKey: string | null = null;

  const captureUiState = () => {
    shouldRestoreUiState = true;
    preservedScrollTop = getAppShellScrollTop();
    preservedFocusedAdvancedKey = getFocusedAdvancedControlKey();
  };

  if (!currentCatalog) {
    captureUiState();
    syncBoostingBackground(false);
    rootElement.innerHTML = `<div class="app-shell"><section class="hero"><p class="hero__subtitle">${escapeHtml(t("loadingLabel"))}</p></section></div>`;
    restoreAppShellUiState(preservedScrollTop, preservedFocusedAdvancedKey);
    handleRootTooltipViewportChange();
    return;
  }

  if (!currentState) {
    captureUiState();
    syncBoostingBackground(false);
    renderedSignature = "";
    rootElement.innerHTML = `
      <div class="app-shell">
        <section class="hero">
          <div class="hero__eyebrow">
            <span class="chip">${escapeHtml(translate(currentCatalog, "errorPrefix"))}</span>
          </div>
          <p class="hero__subtitle">${escapeHtml(formatLocalizedMessage(transientError) || translate(currentCatalog, "tabUnavailable"))}</p>
        </section>
      </div>
    `;
    restoreAppShellUiState(preservedScrollTop, preservedFocusedAdvancedKey);
    handleRootTooltipViewportChange();
    return;
  }

  const viewModel = buildPopupViewModel(currentState);
  syncBoostingBackground(Boolean(viewModel.currentSession));
  const signature = createRenderSignature(viewModel);

  if (signature !== renderedSignature) {
    captureUiState();
    rootElement.innerHTML = renderMarkup(viewModel);
    renderedSignature = signature;
  }

  syncDynamicUi(viewModel);

  if (shouldRestoreUiState) {
    restoreAppShellUiState(preservedScrollTop, preservedFocusedAdvancedKey);
  }

  handleRootTooltipViewportChange();
}

/**
 * Genera el markup estático del popup a partir del view model actual.
 */
function renderMarkup(viewModel: ReturnType<typeof buildPopupViewModel>): string {
  if (!currentCatalog) {
    return "";
  }

  const currentSession = viewModel.currentSession;
  const currentTab = viewModel.currentTab;
  const advancedAudioSettings = getVisibleAdvancedAudioSettings(viewModel);
  const currentWarning = currentSession?.warning ?? deriveWarning(draftGainPercent, 0);
  const levelPercent = deriveLiveActivityPercent(currentSession?.level);
  const laneStatus = getLaneStatus(viewModel);
  const siteAutoEnabled = isSiteAutoEnabled(viewModel);
  const globalAutoEnabled = isGlobalAutoEnabled(viewModel);
  const siteLaneButtonCopy = getLaneButtonCopy("current-tab", siteAutoEnabled, currentCatalog);
  const globalLaneButtonCopy = getLaneButtonCopy("all-sites", globalAutoEnabled, currentCatalog);
  const controlsLocked = !currentTab;
  const protectionBypassed = currentSession?.protectionBypassed ?? advancedAudioSettings.qualityProtectorMode === "off";
  const qualityProtectorSubtitle = qualityProtectorSubtitleCopy(advancedAudioSettings.qualityProtectorMode);
  const protectionAction = formatProtectionAction(
    currentSession?.protectorActionDb ?? 0,
    protectionBypassed
  );
  const clipEvents = String(currentSession?.clipEvents ?? 0);
  const clipPeak = formatClipPeak(currentSession?.clipPeak ?? 0);
  const protectionLoad = formatProtectionLoad(currentSession);
  const clippingSafety = formatClippingSafety(currentSession?.outputPeak ?? 0);
  const clippingSafetyAlert = getClippingSafetyAlert(currentSession?.outputPeak ?? 0, currentSession?.clipEvents ?? 0);
  const sessionCarousel = buildSessionCarouselModel(viewModel.activeSessions, sessionCarouselOffset);
  sessionCarouselOffset = sessionCarousel.offset;

  return `
    <div class="app-shell">
      ${
        transientError
          ? `<section class="error-banner" data-role="error-banner">${escapeHtml(formatLocalizedMessage(transientError))}</section>`
          : ""
      }

      <section class="panel panel--stack panel--current-tab">
        <div class="panel__header panel__header--current">
          <div class="tab-hero">
            <span class="tab-hero__context">${escapeHtml(translate(currentCatalog, "currentTabLabel"))}</span>
            ${renderSiteFavicon(
              currentTab?.title || translate(currentCatalog, "tabUnavailable"),
              currentTab?.domain,
              "large"
            )}
            <div class="tab-hero__copy">
              <h2 class="tab-title">${escapeHtml(currentTab?.title || translate(currentCatalog, "tabUnavailable"))}</h2>
            </div>
          </div>
        </div>

        ${
          currentTab?.supported
            ? ""
            : `
              <div class="error-banner">
                <strong>${escapeHtml(translate(currentCatalog, "unsupportedTitle"))}</strong><br />
                ${escapeHtml(translate(currentCatalog, "unsupportedDetail"))}
              </div>
            `
        }

        <div class="booster-controls-stage" data-state="${controlsLocked ? "locked" : "live"}">
          <div class="slider-card">
            <div class="booster-lane-grid">
              <section class="booster-lane-status" data-role="lane-status" data-tone="${laneStatus.tone}">
                <div class="booster-lane-status__meta">
                  <span class="slider-label">${escapeHtml(translate(currentCatalog, "laneStatusTitle"))}</span>
                  <span class="booster-lane-status__badge" data-role="lane-status-badge">${escapeHtml(laneStatus.badge)}</span>
                </div>
                <strong data-role="lane-status-heading">${escapeHtml(laneStatus.title)}</strong>
                <p data-role="lane-status-detail">${escapeHtml(laneStatus.detail)}</p>
              </section>

              <div class="booster-lane-actions">
                <button
                  class="ghost-button ghost-button--lane ${siteAutoEnabled ? "is-active" : ""}"
                  data-lane-kind="current-tab"
                  data-role="toggle-site-auto"
                  data-action="${siteAutoEnabled ? "disable-site-auto" : "enable-site-auto"}"
                  ${currentTab?.supported ? "" : "disabled"}
                  type="button"
                >
                  <span class="ghost-button--lane__play-indicator" aria-hidden="true">
                    <span class="ghost-button--lane__play-icon"></span>
                  </span>
                  <span class="ghost-button--lane__body">
                    ${renderLaneButtonIcon("current-tab")}
                    <span class="ghost-button--lane__copy">
                      <span class="ghost-button--lane__action" data-role="toggle-site-auto-action">
                        ${escapeHtml(siteLaneButtonCopy.action)}
                      </span>
                      <span class="ghost-button--lane__mode" data-role="toggle-site-auto-mode">
                        ${escapeHtml(siteLaneButtonCopy.mode)}
                      </span>
                    </span>
                  </span>
                </button>
                <button
                  class="ghost-button ghost-button--lane ghost-button--lane-global ${globalAutoEnabled ? "is-active" : ""}"
                  data-lane-kind="all-sites"
                  data-role="toggle-global-auto"
                  data-action="${globalBoosterButtonAction(viewModel)}"
                  ${currentTab ? "" : "disabled"}
                  type="button"
                >
                  <span class="ghost-button--lane__play-indicator" aria-hidden="true">
                    <span class="ghost-button--lane__play-icon"></span>
                  </span>
                  <span class="ghost-button--lane__body">
                    ${renderLaneButtonIcon("all-sites")}
                    <span class="ghost-button--lane__copy">
                      <span class="ghost-button--lane__action" data-role="toggle-global-auto-action">
                        ${escapeHtml(globalLaneButtonCopy.action)}
                      </span>
                      <span class="ghost-button--lane__mode" data-role="toggle-global-auto-mode">
                        ${escapeHtml(globalLaneButtonCopy.mode)}
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div class="slider-card__body">
              <div
                class="gain-control"
                data-role="gain-slider-shell"
                style="--slider-progress:${getSliderProgressPercent(draftGainPercent)}%;"
              >
                <div class="gain-control__value-badge" data-role="slider-value">
                  ${formatPresetValue(draftGainPercent)}%
                </div>
                <div class="gain-control__surface">
                  <div class="gain-control__beam" aria-hidden="true"></div>
                  <div class="gain-control__lane" aria-hidden="true">
                    <div class="gain-control__lane-fill"></div>
                    <div class="gain-control__thumb">
                      <span class="gain-control__thumb-core"></span>
                    </div>
                  </div>
                  <input
                    class="gain-slider"
                    data-role="gain-slider"
                    type="range"
                    min="${MIN_GAIN_PERCENT}"
                    max="${MAX_GAIN_PERCENT}"
                    step="5"
                    value="${draftGainPercent}"
                    ${controlsLocked ? "disabled" : ""}
                  />
                </div>
                <div class="gain-slider-scale" aria-hidden="true">
                  <span>${formatPresetValue(MIN_GAIN_PERCENT)}%</span>
                  <span>${formatPresetValue(MAX_GAIN_PERCENT)}%</span>
                </div>
              </div>

              <div class="preset-section">
                <div class="slider-label">${escapeHtml(translate(currentCatalog, "presetsLabel"))}</div>
                <div class="presets">
                  ${PRESET_VALUES.map(
                    (value) => `
                      <button
                        class="ghost-button ${value === draftGainPercent ? "is-active" : ""}"
                        data-preset="${value}"
                        style="${buildPresetToneStyle(value)}"
                        type="button"
                        ${controlsLocked ? "disabled" : ""}
                      >
                        ${formatPresetValue(value)}
                      </button>
                    `
                  ).join("")}
                </div>
              </div>
            </div>

            <div class="meter">
              <div class="meter__meta">
                <span>${escapeHtml(translate(currentCatalog, "levelLabel"))}</span>
                <span data-role="meter-value">${levelPercent}%</span>
              </div>
              <div class="meter__bar">
                <div class="meter__fill" data-role="meter-fill" style="width:${levelPercent}%"></div>
              </div>
              <div class="meter__meta">
                <span>${escapeHtml(translate(currentCatalog, "warningLabel"))}</span>
                <span class="warning-pill" data-role="warning-pill" data-warning="${currentWarning}">
                  ${escapeHtml(warningCopy(currentWarning))}
                </span>
              </div>
            </div>
          </div>

          <div class="signal-controls-grid signal-controls-grid--standalone">
            <section class="quality-protector">
              <div class="quality-protector__top">
                <div class="quality-protector__header">
                  <div class="quality-protector__copy">
                    <span class="slider-label">${escapeHtml(translate(currentCatalog, "qualityProtectorTitle"))}</span>
                    <strong data-role="quality-protector-mode-value">${escapeHtml(
                      qualityProtectorModeCopy(advancedAudioSettings.qualityProtectorMode)
                    )}</strong>
                    <p data-role="quality-protector-subtitle">${escapeHtml(qualityProtectorSubtitle)}</p>
                  </div>
                  <span
                    class="quality-protector__state"
                    data-role="quality-protector-state"
                    data-bypass="${protectionBypassed}"
                  >
                    ${escapeHtml(qualityProtectorStateCopy(protectionBypassed))}
                  </span>
                </div>
              </div>
              <div class="quality-protector__body">
                <div class="quality-protector__modes">
                  ${QUALITY_PROTECTOR_VALUES.map(
                    (mode) => `
                      <button
                        class="ghost-button ghost-button--protector ${advancedAudioSettings.qualityProtectorMode === mode ? "is-active" : ""}"
                        data-quality-protector="${mode}"
                        type="button"
                        ${controlsLocked ? "disabled" : ""}
                      >
                        ${escapeHtml(qualityProtectorButtonCopy(mode))}
                      </button>
                    `
                  ).join("")}
                </div>
                <div class="telemetry-strip telemetry-strip--protector">
                  <div class="telemetry-pill" data-role="protection-load-pill">
                    ${renderTelemetryPillLabel(
                      "protectionLoadLabel",
                      "protectionLoadHelpLabel",
                      "protectionLoadHelpText",
                      "protection-load-tooltip"
                    )}
                    <strong data-role="protection-load-value">${escapeHtml(protectionLoad)}</strong>
                  </div>
                  <div class="telemetry-pill" data-role="protection-action-pill" data-bypass="${protectionBypassed}">
                    ${renderTelemetryPillLabel(
                      "protectionActionLabel",
                      "protectionActionHelpLabel",
                      "protectionActionHelpText",
                      "protection-action-tooltip"
                    )}
                    <strong data-role="protection-action-value">${escapeHtml(protectionAction)}</strong>
                  </div>
                  <div class="telemetry-pill" data-role="clipping-safety-pill" data-alert="${clippingSafetyAlert}">
                    ${renderTelemetryPillLabel(
                      "clippingSafetyLabel",
                      "clippingSafetyHelpLabel",
                      "clippingSafetyHelpText",
                      "clipping-safety-tooltip"
                    )}
                    <strong data-role="clipping-safety-value">${escapeHtml(clippingSafety)}</strong>
                  </div>
                  <div class="telemetry-pill" data-role="clip-events-pill" data-alert="${Number(clipEvents) > 0 ? "danger" : "none"}">
                    ${renderTelemetryPillLabel(
                      "clipEventsLabel",
                      "clipEventsHelpLabel",
                      "clipEventsHelpText",
                      "clip-events-tooltip"
                    )}
                    <strong data-role="clip-events-value">${escapeHtml(clipEvents)}</strong>
                  </div>
                  <div class="telemetry-pill" data-role="clip-peak-pill" data-alert="${(currentSession?.clipPeak ?? 0) > 1 ? "danger" : "none"}">
                    ${renderTelemetryPillLabel(
                      "clipPeakLabel",
                      "clipPeakHelpLabel",
                      "clipPeakHelpText",
                      "clip-peak-tooltip"
                    )}
                    <strong data-role="clip-peak-value">${escapeHtml(clipPeak)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section class="advanced-settings advanced-settings--expanded" data-role="advanced-settings">
              <div class="advanced-settings__summary advanced-settings__summary--static">
                <div class="advanced-settings__headline">
                  <span class="advanced-settings__eyebrow">${escapeHtml(translate(currentCatalog, "advancedTitle"))}</span>
                  <strong data-role="advanced-preset-value">${escapeHtml(qualityPresetCopy(advancedAudioSettings.qualityPreset))}</strong>
                  <p data-role="advanced-preset-subtitle">${escapeHtml(qualityPresetSubtitleCopy(advancedAudioSettings.qualityPreset))}</p>
                </div>
              </div>

              <div class="advanced-settings__body">
                <div class="advanced-presets">
                  <span
                    class="ghost-button ghost-button--soft advanced-custom-badge ${advancedAudioSettings.qualityPreset === "custom" ? "is-active" : ""}"
                    data-role="advanced-custom-badge"
                  >
                    ${escapeHtml(qualityPresetCopy("custom"))}
                  </span>
                  ${ADVANCED_PRESET_VALUES.map(
                    (preset) => `
                      <button
                        class="ghost-button ghost-button--soft ${advancedAudioSettings.qualityPreset === preset ? "is-active" : ""}"
                        data-advanced-preset="${preset}"
                        type="button"
                        ${controlsLocked ? "disabled" : ""}
                      >
                        ${escapeHtml(qualityPresetCopy(preset))}
                      </button>
                    `
                  ).join("")}
                </div>

                <div class="advanced-control-grid">
                  ${renderAdvancedControl("ceilingDb", advancedAudioSettings.ceilingDb, controlsLocked)}
                  ${renderAdvancedControl("lookaheadMs", advancedAudioSettings.lookaheadMs, controlsLocked)}
                  ${renderAdvancedControl("releaseMs", advancedAudioSettings.releaseMs, controlsLocked)}
                  ${renderAdvancedControl("multibandDepth", advancedAudioSettings.multibandDepth, controlsLocked)}
                  ${renderAdvancedControl("softClipMix", advancedAudioSettings.softClipMix, controlsLocked)}
                </div>
              </div>
            </section>
          </div>
          ${controlsLocked ? '<div class="booster-controls-stage__overlay" aria-hidden="true"></div>' : ""}
        </div>
      </section>

      <section class="panel panel--stack">
        <div class="panel__header panel__header--sessions">
          <div class="section-intro">
            <p class="panel__title">${escapeHtml(translate(currentCatalog, "otherSessionsTitle"))}</p>
            <div class="session-section-summary">
              <span class="session-count-badge" data-role="other-session-count">${viewModel.activeSessions.length}</span>
              <p class="section-summary" data-role="session-summary">
                ${escapeHtml(sessionSummaryCopy(viewModel.activeSessions.length))}
              </p>
            </div>
          </div>
          <button class="ghost-button ghost-button--soft" data-action="stop-all" type="button" ${
            viewModel.activeSessions.length ? "" : "disabled"
          }>
            ${escapeHtml(translate(currentCatalog, "stopAll"))}
          </button>
        </div>

        <div class="session-carousel" data-role="other-sessions" data-offset="${sessionCarousel.offset}">
          <button
            class="session-carousel__nav session-carousel__nav--previous ${
              sessionCarousel.canScrollPrevious ? "" : "is-hidden"
            }"
            data-session-carousel-nav="previous"
            type="button"
            aria-label="${escapeHtml(translate(currentCatalog, "sessionCarouselPrevious"))}"
            ${sessionCarousel.canScrollPrevious ? "" : "disabled"}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div class="session-carousel__viewport">
            <div
              class="session-carousel__track"
              data-role="session-carousel-track"
              style="--session-carousel-offset:${sessionCarousel.offset};"
            >
              ${sessionCarousel.items
                .map((item) =>
                  item.kind === "session"
                    ? renderSessionCard(item.session, viewModel.currentTab?.tabId)
                    : renderSessionPlaceholderCard(item.placeholderIndex)
                )
                .join("")}
            </div>
          </div>
          <button
            class="session-carousel__nav session-carousel__nav--next ${
              sessionCarousel.canScrollNext ? "" : "is-hidden"
            }"
            data-session-carousel-nav="next"
            type="button"
            aria-label="${escapeHtml(translate(currentCatalog, "sessionCarouselNext"))}"
            ${sessionCarousel.canScrollNext ? "" : "disabled"}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderSessionCard(session: CaptureSessionState, currentTabId?: number): string {
  if (!currentCatalog) {
    return "";
  }

  const levelPercent = formatLevelPercent(session.level);
  const meterWidth = Math.max(8, Math.round(session.level * 100));
  const isCurrentTabSession = currentTabId === session.tabId;
  const visualStatus = getVisualStatus(session, true);
  const protectionAction = formatProtectionAction(session.protectorActionDb, session.protectionBypassed);

  return `
    <article class="session-card ${isCurrentTabSession ? "session-card--current" : ""}" data-session-tab="${session.tabId}">
      <div class="session-card__top">
        <div class="session-card__identity">
          ${renderSiteFavicon(session.title, session.domain, "small")}
          <div class="session-card__copy">
            <div class="session-card__title-row">
              <h4 class="session-card__title">${escapeHtml(session.title)}</h4>
              ${
                isCurrentTabSession
                  ? `<span class="session-card__current-badge">${escapeHtml(
                      translate(currentCatalog, "currentTabLabel")
                    )}</span>`
                  : ""
              }
            </div>
            <div class="session-card__domain">${escapeHtml(session.domain || session.url || t("webLabel"))}</div>
          </div>
        </div>
      </div>

      <div class="session-card__metrics">
        <div class="session-stat">
          <span class="session-stat__label">${escapeHtml(translate(currentCatalog, "boostLabel"))}</span>
          <strong class="session-stat__value" data-role="session-gain">${session.gainPercent}%</strong>
        </div>
        <div class="session-stat">
          <span class="session-stat__label">${escapeHtml(translate(currentCatalog, "levelLabel"))}</span>
          <strong class="session-stat__value" data-role="session-level">${levelPercent}</strong>
        </div>
        <div class="session-stat">
          <span class="session-stat__label">${escapeHtml(translate(currentCatalog, "warningLabel"))}</span>
          <strong class="session-stat__value session-stat__value--warning" data-role="session-warning" data-warning="${session.warning}">
            ${escapeHtml(warningCopy(session.warning))}
          </strong>
        </div>
        <div class="session-stat">
          <span class="session-stat__label">${escapeHtml(translate(currentCatalog, "protectionActionLabel"))}</span>
          <strong class="session-stat__value" data-role="session-protection-action">
            ${escapeHtml(protectionAction)}
          </strong>
        </div>
        <div class="session-stat">
          <span class="session-stat__label">${escapeHtml(translate(currentCatalog, "clipEventsLabel"))}</span>
          <strong class="session-stat__value" data-role="session-clip-events">${session.clipEvents}</strong>
        </div>
      </div>

      <div class="session-card__meter">
        <div class="session-card__meter-meta">
          <span>${escapeHtml(translate(currentCatalog, "levelLabel"))}</span>
          <span data-role="session-level-meter">${levelPercent}</span>
        </div>
        <div class="meter__bar meter__bar--session">
          <div class="meter__fill meter__fill--session" data-role="session-meter-fill" style="width:${meterWidth}%"></div>
        </div>
      </div>

      <div class="session-card__footer">
        <div class="session-card__footer-copy">
          <span class="session-card__status-dot" data-state="${visualStatus}"></span>
          <span class="session-card__footer-text">${escapeHtml(statusCopy(visualStatus))}</span>
        </div>
        <button class="ghost-button ghost-button--danger" data-stop-tab="${session.tabId}" type="button">
          ${escapeHtml(translate(currentCatalog, "stopSession"))}
        </button>
      </div>
    </article>
  `;
}

function renderSessionPlaceholderCard(placeholderIndex: number): string {
  if (!currentCatalog) {
    return "";
  }

  return `
    <article class="session-card session-card--placeholder" data-session-placeholder="${placeholderIndex}" aria-hidden="true">
      <div class="session-card__placeholder-orb"></div>
      <div class="session-card__placeholder-copy">
        <span class="session-card__placeholder-label">${escapeHtml(
          translate(currentCatalog, "sessionPlaceholderTitle")
        )}</span>
        <p>${escapeHtml(translate(currentCatalog, "sessionPlaceholderDetail"))}</p>
      </div>
    </article>
  `;
}

function bindRootEvents(): void {
  if (rootEventsBound) {
    return;
  }

  rootElement.addEventListener("click", handleRootClick);
  rootElement.addEventListener("pointerdown", handleRootPointerDown);
  rootElement.addEventListener("pointermove", handleRootPointerMove);
  rootElement.addEventListener("input", handleRootInput);
  rootElement.addEventListener("change", handleRootChange);
  rootElement.addEventListener("error", handleRootError, true);
  rootElement.addEventListener("mouseover", handleRootTooltipTrigger);
  rootElement.addEventListener("mouseout", handleRootTooltipLeave);
  rootElement.addEventListener("focusin", handleRootTooltipTrigger);
  rootElement.addEventListener("focusout", handleRootTooltipLeave);
  rootElement.addEventListener("scroll", handleRootTooltipViewportChange, true);
  window.addEventListener("resize", handleRootTooltipViewportChange);
  rootEventsBound = true;
}

function handleRootError(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLImageElement) || target.dataset.role !== "site-favicon-image") {
    return;
  }

  const faviconFrame = target.closest<HTMLElement>("[data-role='site-favicon']");

  if (!faviconFrame) {
    return;
  }

  faviconFrame.dataset.broken = "true";
  target.remove();
}

function handleRootTooltipTrigger(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const helpWrap = target.closest<HTMLElement>(".telemetry-pill__help-wrap");

  if (!helpWrap) {
    return;
  }

  showHelpTooltip(helpWrap);
}

function handleRootTooltipViewportChange(): void {
  if (tooltipRefreshFrame !== null) {
    window.cancelAnimationFrame(tooltipRefreshFrame);
  }

  tooltipRefreshFrame = window.requestAnimationFrame(() => {
    tooltipRefreshFrame = null;
    if (!activeHelpTooltipAnchor || !activeHelpTooltipAnchor.isConnected) {
      hideHelpTooltip();
      return;
    }

    const anchorStillActive =
      activeHelpTooltipAnchor.matches(":hover") || activeHelpTooltipAnchor.contains(document.activeElement);

    if (!anchorStillActive) {
      hideHelpTooltip();
      return;
    }

    positionHelpTooltip(activeHelpTooltipAnchor);
  });
}

function handleRootTooltipLeave(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const helpWrap = target.closest<HTMLElement>(".telemetry-pill__help-wrap");

  if (!helpWrap) {
    return;
  }

  const relatedTarget =
    event instanceof MouseEvent || event instanceof FocusEvent ? event.relatedTarget : null;

  if (relatedTarget instanceof Node && helpWrap.contains(relatedTarget)) {
    return;
  }

  if (activeHelpTooltipAnchor === helpWrap) {
    hideHelpTooltip();
  }
}

function positionHelpTooltip(helpWrap: HTMLElement): void {
  const tooltip = ensureFloatingHelpTooltip();
  const tooltipContent = helpWrap.querySelector<HTMLElement>(".telemetry-pill__tooltip")?.textContent?.trim();

  if (!tooltipContent) {
    hideHelpTooltip();
    return;
  }

  tooltip.textContent = tooltipContent;
  tooltip.dataset.visible = "true";

  const wrapRect = helpWrap.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportPadding = 12;
  const gap = 10;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  let side: "top" | "bottom" = "top";
  let top = wrapRect.top - tooltipHeight - gap;

  if (top < viewportPadding) {
    side = "bottom";
    top = wrapRect.bottom + gap;
  }

  top = clampNumber(top, viewportPadding, Math.max(viewportPadding, viewportHeight - tooltipHeight - viewportPadding));

  const idealLeft = wrapRect.right - tooltipWidth;
  const left = clampNumber(
    idealLeft,
    viewportPadding,
    Math.max(viewportPadding, viewportWidth - tooltipWidth - viewportPadding)
  );
  const arrowLeft = clampNumber(wrapRect.left + wrapRect.width / 2 - left, 14, Math.max(14, tooltipWidth - 14));

  helpWrap.dataset.tooltipSide = side;
  tooltip.dataset.side = side;
  tooltip.style.setProperty("--tooltip-left", `${left}px`);
  tooltip.style.setProperty("--tooltip-top", `${top}px`);
  tooltip.style.setProperty("--tooltip-hidden-y", side === "top" ? "4px" : "-4px");
  tooltip.style.setProperty("--tooltip-arrow-left", `${arrowLeft}px`);
}

function showHelpTooltip(helpWrap: HTMLElement): void {
  activeHelpTooltipAnchor = helpWrap;
  positionHelpTooltip(helpWrap);
}

function hideHelpTooltip(): void {
  activeHelpTooltipAnchor = null;
  const tooltip = document.querySelector<HTMLElement>(".floating-help-tooltip");

  if (!tooltip) {
    return;
  }

  tooltip.dataset.visible = "false";
}

function ensureFloatingHelpTooltip(): HTMLElement {
  let tooltip = document.querySelector<HTMLElement>(".floating-help-tooltip");

  if (tooltip) {
    return tooltip;
  }

  tooltip = document.createElement("div");
  tooltip.className = "floating-help-tooltip";
  tooltip.id = "floating-help-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.dataset.visible = "false";
  document.body.appendChild(tooltip);
  return tooltip;
}

function handleRootClick(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const sessionCarouselNav = target.closest<HTMLButtonElement>("[data-session-carousel-nav]");

  if (sessionCarouselNav?.dataset.sessionCarouselNav) {
    sessionCarouselOffset = shiftSessionCarouselOffset(
      currentState?.sessions.length ?? 0,
      sessionCarouselOffset,
      sessionCarouselNav.dataset.sessionCarouselNav === "next" ? "next" : "previous"
    );
    renderedSignature = "";
    render();
    return;
  }

  const presetButton = target.closest<HTMLButtonElement>("[data-preset]");

  if (presetButton?.dataset.preset) {
    clearTransientError();
    setDraftGain(Number(presetButton.dataset.preset), { animateVisuals: true });
    scheduleGainCommit(true);
    return;
  }

  const advancedPresetButton = target.closest<HTMLButtonElement>("[data-advanced-preset]");

  if (advancedPresetButton?.dataset.advancedPreset) {
    clearTransientError();
    const visibleSettings = currentState ? getVisibleAdvancedAudioSettings(buildPopupViewModel(currentState)) : null;
    setDraftAdvancedAudioSettings(
      applyQualityPreset(
        advancedPresetButton.dataset.advancedPreset as Exclude<QualityPreset, "custom">,
        visibleSettings?.qualityProtectorMode
      )
    );
    scheduleAdvancedSettingsCommit(true);
    return;
  }

  const qualityProtectorButton = target.closest<HTMLButtonElement>("[data-quality-protector]");

  if (qualityProtectorButton?.dataset.qualityProtector && currentState) {
    clearTransientError();
    setDraftAdvancedAudioSettings({
      ...getVisibleAdvancedAudioSettings(buildPopupViewModel(currentState)),
      qualityProtectorMode: qualityProtectorButton.dataset.qualityProtector as AudioQualityProtectorMode
    });
    scheduleAdvancedSettingsCommit(true);
    return;
  }

  const stopSessionButton = target.closest<HTMLButtonElement>("[data-stop-tab]");

  if (stopSessionButton?.dataset.stopTab) {
    void stopCapture(Number(stopSessionButton.dataset.stopTab));
    return;
  }

  const actionButton = target.closest<HTMLButtonElement>("[data-action]");

  if (!actionButton?.dataset.action) {
    return;
  }

  switch (actionButton.dataset.action) {
    case "start-manual": {
      const tabId = currentState?.currentTab?.tabId;

      if (tabId) {
        void startCapture(tabId);
      }
      return;
    }
    case "stop-manual": {
      const tabId = currentState?.currentTab?.tabId;

      if (tabId) {
        void stopCapture(tabId);
      }
      return;
    }
    case "stop-all":
      void stopAllSessions();
      return;
    case "toggle-current-site": {
      const tabId = currentState?.currentTab?.tabId;

      if (tabId) {
        void toggleCurrentSitePreference(tabId);
      }
      return;
    }
    case "enable-site-auto": {
      const tabId = currentState?.currentTab?.tabId;

      if (tabId) {
        void enableCurrentTabBooster(tabId);
      }
      return;
    }
    case "disable-site-auto": {
      const tabId = currentState?.currentTab?.tabId;

      if (tabId) {
        void disableCurrentTabBooster(tabId);
      }
      return;
    }
    case "enable-global-auto": {
      const tabId = currentState?.currentTab?.tabId;

      if (tabId) {
        void enableGlobalAutoBooster(tabId);
      }
      return;
    }
    case "request-global-auto-permission":
      void requestGlobalAutoPermission();
      return;
    case "disable-global-auto":
      void disableGlobalAutoBooster();
      return;
  }
}

function handleRootPointerDown(event: PointerEvent): void {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) || target.dataset.role !== "gain-slider") {
    clearPendingGainTrackJump();
    return;
  }

  pendingGainTrackJumpAnimationAt = performance.now();
  pendingGainTrackJumpPointerId = event.pointerId;
  pendingGainTrackJumpStartX = event.clientX;
  pendingGainTrackJumpMoved = false;
}

function handleRootPointerMove(event: PointerEvent): void {
  if (
    pendingGainTrackJumpPointerId !== event.pointerId ||
    pendingGainTrackJumpStartX === null ||
    pendingGainTrackJumpMoved
  ) {
    return;
  }

  if (Math.abs(event.clientX - pendingGainTrackJumpStartX) > GAIN_TRACK_DRAG_THRESHOLD_PX) {
    pendingGainTrackJumpMoved = true;
  }
}

function handleRootInput(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.role !== "gain-slider") {
    if (target.dataset.role === "advanced-slider" && target.dataset.advancedKey) {
      clearTransientError();
      isAdjustingAdvancedSettings = true;
      updateDraftAdvancedSetting(target.dataset.advancedKey as AdvancedControlKey, Number(target.value));
      scheduleAdvancedSettingsCommit(false);
    }
    return;
  }

  clearTransientError();
  isAdjustingGain = true;
  const animateTrackJump =
    pendingGainTrackJumpAnimationAt > 0 &&
    !pendingGainTrackJumpMoved &&
    performance.now() - pendingGainTrackJumpAnimationAt <= GAIN_TRACK_JUMP_WINDOW_MS;
  setDraftGain(Number(target.value), { animateVisuals: animateTrackJump });
  clearPendingGainTrackJump();
  scheduleGainCommit(false);
}

function handleRootChange(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.role !== "gain-slider") {
    if (target.dataset.role === "advanced-slider") {
      isAdjustingAdvancedSettings = false;
      void flushAdvancedSettingsCommit();
    }
    return;
  }

  isAdjustingGain = false;
  clearPendingGainTrackJump();
  void flushGainCommit();
}

function setDraftGain(nextValue: number, options: GainVisualSyncOptions = {}): void {
  draftGainPercent = clampGainPercent(nextValue);
  syncCurrentViewModel(options);
}

function scheduleGainCommit(immediate: boolean): void {
  const currentSession = getCurrentSession();

  if (!currentSession) {
    pendingGainPercent = null;
    return;
  }

  pendingGainPercent = draftGainPercent;

  if (gainCommitTimer !== null) {
    window.clearTimeout(gainCommitTimer);
    gainCommitTimer = null;
  }

  if (immediate) {
    void flushGainCommit();
    return;
  }

  gainCommitTimer = window.setTimeout(() => {
    gainCommitTimer = null;
    void flushGainCommit();
  }, GAIN_COMMIT_DEBOUNCE_MS);
}

function setDraftAdvancedAudioSettings(nextSettings: AdvancedAudioSettings): void {
  draftAdvancedAudioSettings = sanitizeAdvancedAudioSettings(nextSettings);
  syncCurrentViewModel();
}

function updateDraftAdvancedSetting(key: AdvancedControlKey, value: number): void {
  if (!currentState) {
    return;
  }

  const baseSettings = getVisibleAdvancedAudioSettings(buildPopupViewModel(currentState));
  setDraftAdvancedAudioSettings({
    ...baseSettings,
    [key]: value,
    qualityPreset: "custom"
  });
}

function scheduleAdvancedSettingsCommit(immediate: boolean): void {
  const nextSettings = draftAdvancedAudioSettings;

  if (!nextSettings) {
    pendingAdvancedAudioSettings = null;
    return;
  }

  pendingAdvancedAudioSettings = { ...nextSettings };

  if (advancedCommitTimer !== null) {
    window.clearTimeout(advancedCommitTimer);
    advancedCommitTimer = null;
  }

  if (immediate) {
    void flushAdvancedSettingsCommit();
    return;
  }

  advancedCommitTimer = window.setTimeout(() => {
    advancedCommitTimer = null;
    void flushAdvancedSettingsCommit();
  }, ADVANCED_COMMIT_DEBOUNCE_MS);
}

async function flushGainCommit(): Promise<void> {
  if (gainCommitTimer !== null) {
    window.clearTimeout(gainCommitTimer);
    gainCommitTimer = null;
  }

  if (gainCommitInFlight) {
    return;
  }

  const currentSession = getCurrentSession();
  const targetGain = pendingGainPercent;

  if (!currentSession || targetGain === null) {
    pendingGainPercent = null;
    return;
  }

  if (currentSession.gainPercent === targetGain) {
    pendingGainPercent = null;
    return;
  }

  gainCommitInFlight = true;

  const response = await sendMessageSafe<WorkerState>({
    type: "SET_GAIN",
    payload: { tabId: currentSession.tabId, gainPercent: targetGain }
  });

  gainCommitInFlight = false;

  if (!response.ok || !response.data) {
    pendingGainPercent = null;
    transientError = response.errorMessage ?? message("errorExtensionActionFailed");
    render();
    return;
  }

  await applyState(response.data);

  if (pendingGainPercent !== null) {
    const refreshedSession = getCurrentSession();

    if (refreshedSession && refreshedSession.gainPercent !== pendingGainPercent) {
      await flushGainCommit();
    }
  }
}

async function flushAdvancedSettingsCommit(): Promise<void> {
  if (advancedCommitTimer !== null) {
    window.clearTimeout(advancedCommitTimer);
    advancedCommitTimer = null;
  }

  if (advancedCommitInFlight) {
    return;
  }

  const targetSettings = pendingAdvancedAudioSettings;

  if (!targetSettings || areAdvancedSettingsEqual(targetSettings, currentState?.advancedAudioSettings)) {
    pendingAdvancedAudioSettings = null;
    return;
  }

  advancedCommitInFlight = true;

  const response = await sendMessageSafe<WorkerState>({
    type: "SET_ADVANCED_AUDIO_SETTINGS",
    payload: targetSettings
  });

  advancedCommitInFlight = false;

  if (!response.ok || !response.data) {
    pendingAdvancedAudioSettings = null;
    transientError = response.errorMessage ?? message("errorExtensionActionFailed");
    render();
    return;
  }

  await applyState(response.data);

  if (
    pendingAdvancedAudioSettings &&
    !areAdvancedSettingsEqual(pendingAdvancedAudioSettings, response.data.advancedAudioSettings)
  ) {
    await flushAdvancedSettingsCommit();
  }
}

async function startCapture(tabId: number): Promise<void> {
  clearTransientError();
  pendingGainPercent = null;
  render();
  const response = await sendMessageSafe<WorkerState>({
    type: "START_CAPTURE",
    payload: { tabId, gainPercent: draftGainPercent }
  });
  await handleWorkerResponse(response);
}

async function enableCurrentTabBooster(tabId: number): Promise<void> {
  if (!confirmCurrentSiteAutoBooster()) {
    return;
  }

  clearTransientError();
  const response = await sendMessageSafe<WorkerState>({
    type: "ENABLE_CURRENT_TAB_BOOSTER",
    payload: { tabId, gainPercent: draftGainPercent }
  });
  await handleWorkerResponse(response);
}

async function disableCurrentTabBooster(tabId: number): Promise<void> {
  clearTransientError();
  const response = await sendMessageSafe<WorkerState>({
    type: "DISABLE_CURRENT_TAB_BOOSTER",
    payload: { tabId }
  });
  await handleWorkerResponse(response);
}

async function enableGlobalAutoBooster(
  tabId: number,
  options: { skipConfirmation?: boolean } = {}
): Promise<void> {
  if (!options.skipConfirmation && !confirmGlobalAutoBooster()) {
    return;
  }

  clearTransientError();
  const response = await sendMessageSafe<WorkerState>({
    type: "ENABLE_GLOBAL_AUTO_BOOSTER",
    payload: { tabId, gainPercent: draftGainPercent }
  });
  await handleWorkerResponse(response);
}

async function requestGlobalAutoPermission(): Promise<void> {
  clearTransientError();
  const response = await sendMessageSafe<WorkerState>({ type: "REQUEST_GLOBAL_PERMISSION" });
  await handleWorkerResponse(response);

  if (!response.ok || !response.data) {
    return;
  }

  const recoverableTabId = getRecoverableGlobalAutoTabId(response.data);

  if (recoverableTabId === null) {
    return;
  }

  await enableGlobalAutoBooster(recoverableTabId, { skipConfirmation: true });
}

async function disableGlobalAutoBooster(): Promise<void> {
  clearTransientError();
  const response = await sendMessageSafe<WorkerState>({ type: "DISABLE_GLOBAL_AUTO_BOOSTER" });
  await handleWorkerResponse(response);
}

async function stopCapture(tabId: number): Promise<void> {
  clearTransientError();
  pendingGainPercent = null;
  const response = await sendMessageSafe<WorkerState>({
    type: "STOP_CAPTURE",
    payload: { tabId }
  });
  await handleWorkerResponse(response);
}

async function stopAllSessions(): Promise<void> {
  clearTransientError();
  pendingGainPercent = null;
  const response = await sendMessageSafe<WorkerState>({ type: "STOP_ALL" });
  await handleWorkerResponse(response);
}

async function toggleCurrentSitePreference(tabId: number): Promise<void> {
  clearTransientError();
  const currentTab = currentState?.currentTab;
  const shouldForget =
    currentTab?.tabId === tabId &&
    currentTab.hasStoredPreference &&
    currentTab.preferredGainPercent === draftGainPercent;
  const response = shouldForget
    ? await sendMessageSafe<WorkerState>({
        type: "REMOVE_DOMAIN_GAIN",
        payload: { tabId }
      })
    : await sendMessageSafe<WorkerState>({
        type: "SAVE_DOMAIN_GAIN",
        payload: { tabId, gainPercent: draftGainPercent }
      });
  await handleWorkerResponse(response);
}

async function handleWorkerResponse(response: RuntimeResponse<WorkerState>): Promise<void> {
  if (!response.ok || !response.data) {
    transientError = response.errorMessage ?? message("errorExtensionActionFailed");
    render();
    return;
  }

  transientError = null;
  await applyState(response.data);
}

function applyLevelUpdate(payload: LevelUpdatePayload): boolean {
  const session = findSession(payload.tabId);

  if (!session) {
    return false;
  }

  session.level = payload.level;
  session.warning = payload.warning;
  session.protectorActionDb = payload.protectorActionDb;
  session.clipEvents = payload.clipEvents;
  session.clipPeak = payload.clipPeak;
  session.protectionBypassed = payload.protectionBypassed;
  session.outputPeak = payload.outputPeak;
  return true;
}

function applySessionStatusUpdate(payload: SessionStatusPayload): boolean {
  const session = findSession(payload.tabId);

  if (!session) {
    return false;
  }

  session.streamState = payload.streamState;
  session.engineStatus = payload.engineStatus;
  session.gainPercent = payload.gainPercent;
  session.lastError = payload.lastError;

  if (pendingGainPercent !== null && pendingGainPercent === payload.gainPercent) {
    pendingGainPercent = null;
  }

  if (!isAdjustingGain && pendingGainPercent === null) {
    draftGainPercent = payload.gainPercent;
  }

  return true;
}

function findSession(tabId: number): CaptureSessionState | undefined {
  return currentState?.sessions.find((session) => session.tabId === tabId);
}

function getCurrentSession(): CaptureSessionState | null {
  const currentTabId = currentState?.currentTab?.tabId;

  if (!currentTabId) {
    return null;
  }

  return findSession(currentTabId) ?? null;
}

function syncCurrentViewModel(options: GainVisualSyncOptions = {}): void {
  if (!currentState || !currentCatalog) {
    render();
    return;
  }

  syncDynamicUi(buildPopupViewModel(currentState), options);
}

function syncDynamicUi(
  viewModel: ReturnType<typeof buildPopupViewModel>,
  options: GainVisualSyncOptions = {}
): void {
  if (!currentCatalog) {
    return;
  }

  const currentSession = viewModel.currentSession;
  const currentManualSession = viewModel.currentManualSession;
  const currentTab = viewModel.currentTab;
  const advancedAudioSettings = getVisibleAdvancedAudioSettings(viewModel);
  const currentWarning = currentSession?.warning ?? deriveWarning(draftGainPercent, 0);
  const currentStatus = getVisualStatus(currentSession, currentTab?.supported ?? false);
  const levelPercent = deriveLiveActivityPercent(currentSession?.level);
  const protectionBypassed = currentSession?.protectionBypassed ?? advancedAudioSettings.qualityProtectorMode === "off";
  const protectionAction = formatProtectionAction(
    currentSession?.protectorActionDb ?? 0,
    protectionBypassed
  );
  const clipEvents = currentSession?.clipEvents ?? 0;
  const clipPeak = currentSession?.clipPeak ?? 0;
  const protectionLoad = formatProtectionLoad(currentSession);
  const clippingSafety = formatClippingSafety(currentSession?.outputPeak ?? 0);
  const protectionTelemetryDisplayKey = [
    currentSession?.tabId ?? "none",
    currentSession?.streamState ?? "inactive",
    advancedAudioSettings.qualityProtectorMode,
    protectionBypassed ? "bypassed" : "protected"
  ].join("|");
  const laneGrid = rootElement.querySelector<HTMLElement>(".booster-lane-grid");
  const previousLaneGridHeight = laneGrid?.getBoundingClientRect().height ?? 0;

  setText("[data-role='meter-value']", `${levelPercent}%`);
  setText("[data-role='other-session-count']", String(viewModel.activeSessions.length));
  setText(
    "[data-role='session-summary']",
    sessionSummaryCopy(viewModel.activeSessions.length)
  );

  const statusPill = rootElement.querySelector<HTMLElement>("[data-role='status-pill']");

  if (statusPill) {
    statusPill.dataset.state = currentStatus;
    statusPill.textContent = statusCopy(currentStatus);
  }

  const toggleButton = rootElement.querySelector<HTMLButtonElement>("[data-role='toggle-current']");

  if (toggleButton) {
    const nextToggleMode = getBoosterButtonMode(viewModel);
    toggleButton.dataset.action = currentManualSession ? "stop-manual" : "start-manual";
    toggleButton.dataset.mode = nextToggleMode;
    toggleButton.disabled = !viewModel.canStart && !currentManualSession;
    const toggleButtonLabel =
      toggleButton.querySelector<HTMLElement>("[data-role='toggle-current-label']") || toggleButton;
    toggleButtonLabel.textContent = currentManualSession
      ? translate(currentCatalog, "disableBooster")
      : translate(currentCatalog, "activateBooster");

    if (lastBoosterButtonMode === null) {
      lastBoosterButtonMode = nextToggleMode;
    } else if (lastBoosterButtonMode !== nextToggleMode) {
      triggerBoosterButtonMorph(toggleButton);
      lastBoosterButtonMode = nextToggleMode;
    }
  }

  const laneStatus = getLaneStatus(viewModel);
  const laneStatusDisplayKey = [laneStatus.tone, laneStatus.badge, laneStatus.title, laneStatus.detail].join("|");
  const laneStatusCard = rootElement.querySelector<HTMLElement>("[data-role='lane-status']");
  const laneContentAnimations: HTMLElement[] = [];

  if (laneStatusDisplayKey !== lastLaneStatusDisplayKey) {
    if (laneStatusCard) {
      laneStatusCard.dataset.tone = laneStatus.tone;
      laneContentAnimations.push(laneStatusCard);
    }

    setText("[data-role='lane-status-badge']", laneStatus.badge);
    setText("[data-role='lane-status-heading']", laneStatus.title);
    setText("[data-role='lane-status-detail']", laneStatus.detail);
    lastLaneStatusDisplayKey = laneStatusDisplayKey;
  }

  const siteAutoButton = rootElement.querySelector<HTMLButtonElement>("[data-role='toggle-site-auto']");

  if (siteAutoButton) {
    const siteAutoEnabled = isSiteAutoEnabled(viewModel);
    const previousSiteAutoEnabled = siteAutoButton.classList.contains("is-active");
    siteAutoButton.dataset.action = siteAutoEnabled ? "disable-site-auto" : "enable-site-auto";
    siteAutoButton.disabled = !Boolean(currentTab?.supported);
    siteAutoButton.classList.toggle("is-active", siteAutoEnabled);
    const siteAutoButtonCopy = getLaneButtonCopy("current-tab", siteAutoEnabled, currentCatalog);
    const siteAutoAction =
      siteAutoButton.querySelector<HTMLElement>("[data-role='toggle-site-auto-action']");
    const siteAutoMode =
      siteAutoButton.querySelector<HTMLElement>("[data-role='toggle-site-auto-mode']");
    const previousSiteLabel = `${siteAutoAction?.textContent ?? ""}|${siteAutoMode?.textContent ?? ""}`;
    if (siteAutoAction) {
      siteAutoAction.textContent = siteAutoButtonCopy.action;
    }
    if (siteAutoMode) {
      siteAutoMode.textContent = siteAutoButtonCopy.mode;
    }
    const nextSiteLabel = `${siteAutoButtonCopy.action}|${siteAutoButtonCopy.mode}`;

    if (previousSiteAutoEnabled !== siteAutoEnabled || previousSiteLabel !== nextSiteLabel) {
      laneContentAnimations.push(siteAutoButton);
    }
  }

  const globalAutoButton = rootElement.querySelector<HTMLButtonElement>("[data-role='toggle-global-auto']");

  if (globalAutoButton) {
    const globalAutoEnabled = isGlobalAutoEnabled(viewModel);
    const previousGlobalAutoEnabled = globalAutoButton.classList.contains("is-active");
    globalAutoButton.dataset.action = globalBoosterButtonAction(viewModel);
    globalAutoButton.disabled = !Boolean(currentTab);
    globalAutoButton.classList.toggle("is-active", globalAutoEnabled);
    const globalAutoButtonCopy = getLaneButtonCopy("all-sites", globalAutoEnabled, currentCatalog);
    const globalAutoAction =
      globalAutoButton.querySelector<HTMLElement>("[data-role='toggle-global-auto-action']");
    const globalAutoMode =
      globalAutoButton.querySelector<HTMLElement>("[data-role='toggle-global-auto-mode']");
    const previousGlobalLabel = `${globalAutoAction?.textContent ?? ""}|${globalAutoMode?.textContent ?? ""}`;
    if (globalAutoAction) {
      globalAutoAction.textContent = globalAutoButtonCopy.action;
    }
    if (globalAutoMode) {
      globalAutoMode.textContent = globalAutoButtonCopy.mode;
    }
    const nextGlobalLabel = `${globalAutoButtonCopy.action}|${globalAutoButtonCopy.mode}`;

    if (previousGlobalAutoEnabled !== globalAutoEnabled || previousGlobalLabel !== nextGlobalLabel) {
      laneContentAnimations.push(globalAutoButton);
    }
  }

  const slider = rootElement.querySelector<HTMLInputElement>("[data-role='gain-slider']");

  if (slider) {
    if (slider.value !== String(draftGainPercent)) {
      slider.value = String(draftGainPercent);
    }

    syncSliderVisuals(slider, options.animateVisuals ?? false);
  }

  for (const presetButton of rootElement.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    presetButton.classList.toggle("is-active", Number(presetButton.dataset.preset) === draftGainPercent);
  }

  const meterFill = rootElement.querySelector<HTMLElement>("[data-role='meter-fill']");

  if (meterFill) {
    meterFill.style.width = `${levelPercent}%`;
  }

  const warningPill = rootElement.querySelector<HTMLElement>("[data-role='warning-pill']");

  if (warningPill) {
    warningPill.dataset.warning = currentWarning;
    warningPill.textContent = warningCopy(currentWarning);
  }

  setText("[data-role='quality-protector-mode-value']", qualityProtectorModeCopy(advancedAudioSettings.qualityProtectorMode));
  setText("[data-role='quality-protector-subtitle']", qualityProtectorSubtitleCopy(advancedAudioSettings.qualityProtectorMode));
  setText("[data-role='quality-protector-state']", qualityProtectorStateCopy(protectionBypassed));

  const qualityProtectorState = rootElement.querySelector<HTMLElement>("[data-role='quality-protector-state']");

  if (qualityProtectorState) {
    qualityProtectorState.dataset.bypass = String(protectionBypassed);
  }

  if (shouldSyncProtectorTelemetryUi(protectionTelemetryDisplayKey)) {
    setText("[data-role='protection-action-value']", protectionAction);
    setText("[data-role='clip-events-value']", String(clipEvents));
    setText("[data-role='clip-peak-value']", formatClipPeak(clipPeak));
    setText("[data-role='protection-load-value']", protectionLoad);
    setText("[data-role='clipping-safety-value']", clippingSafety);

    const protectionActionPill = rootElement.querySelector<HTMLElement>("[data-role='protection-action-pill']");

    if (protectionActionPill) {
      protectionActionPill.dataset.bypass = String(protectionBypassed);
    }

    const clipEventsPill = rootElement.querySelector<HTMLElement>("[data-role='clip-events-pill']");

    if (clipEventsPill) {
      clipEventsPill.dataset.alert = clipEvents > 0 ? "danger" : "none";
    }

    const clipPeakPill = rootElement.querySelector<HTMLElement>("[data-role='clip-peak-pill']");

    if (clipPeakPill) {
      clipPeakPill.dataset.alert = clipPeak > 1 ? "danger" : "none";
    }

    const clippingSafetyPill = rootElement.querySelector<HTMLElement>("[data-role='clipping-safety-pill']");

    if (clippingSafetyPill) {
      clippingSafetyPill.dataset.alert = getClippingSafetyAlert(currentSession?.outputPeak ?? 0, clipEvents);
    }
  }

  const advancedPresetValue = rootElement.querySelector<HTMLElement>("[data-role='advanced-preset-value']");

  if (advancedPresetValue) {
    advancedPresetValue.textContent = qualityPresetCopy(advancedAudioSettings.qualityPreset);
  }

  const advancedPresetSubtitle = rootElement.querySelector<HTMLElement>("[data-role='advanced-preset-subtitle']");

  if (advancedPresetSubtitle) {
    advancedPresetSubtitle.textContent = qualityPresetSubtitleCopy(advancedAudioSettings.qualityPreset);
  }

  const advancedCustomBadge = rootElement.querySelector<HTMLElement>("[data-role='advanced-custom-badge']");

  if (advancedCustomBadge) {
    advancedCustomBadge.classList.toggle("is-active", advancedAudioSettings.qualityPreset === "custom");
  }

  for (const presetButton of rootElement.querySelectorAll<HTMLButtonElement>("[data-advanced-preset]")) {
    presetButton.classList.toggle("is-active", presetButton.dataset.advancedPreset === advancedAudioSettings.qualityPreset);
  }

  for (const qualityProtectorButton of rootElement.querySelectorAll<HTMLButtonElement>("[data-quality-protector]")) {
    qualityProtectorButton.classList.toggle(
      "is-active",
      qualityProtectorButton.dataset.qualityProtector === advancedAudioSettings.qualityProtectorMode
    );
  }

  for (const controlInput of rootElement.querySelectorAll<HTMLInputElement>("[data-role='advanced-slider']")) {
    const key = controlInput.dataset.advancedKey as AdvancedControlKey | undefined;

    if (!key) {
      continue;
    }

    const nextValue = advancedAudioSettings[key];
    const numericValue = Number(controlInput.value);

    if (Number.isFinite(nextValue) && numericValue !== nextValue) {
      controlInput.value = String(nextValue);
    }

    const controlCard = controlInput.closest<HTMLElement>(".advanced-control");
    controlCard?.style.setProperty("--advanced-progress", `${getAdvancedSliderProgressPercent(key, nextValue)}%`);
    const valueLabel = controlCard?.querySelector<HTMLElement>("[data-role='advanced-value']");

    if (valueLabel) {
      valueLabel.textContent = formatAdvancedValue(key, nextValue);
    }
  }

  for (const session of viewModel.activeSessions) {
    const sessionCard = rootElement.querySelector<HTMLElement>(`[data-session-tab='${session.tabId}']`);

    if (!sessionCard) {
      continue;
    }

    const sessionStatus = sessionCard.querySelector<HTMLElement>("[data-role='session-status']");
    const sessionGain = sessionCard.querySelector<HTMLElement>("[data-role='session-gain']");
    const sessionLevel = sessionCard.querySelector<HTMLElement>("[data-role='session-level']");
    const sessionLevelMeter = sessionCard.querySelector<HTMLElement>("[data-role='session-level-meter']");
    const sessionWarning = sessionCard.querySelector<HTMLElement>("[data-role='session-warning']");
    const sessionProtectionAction = sessionCard.querySelector<HTMLElement>("[data-role='session-protection-action']");
    const sessionClipEvents = sessionCard.querySelector<HTMLElement>("[data-role='session-clip-events']");
    const sessionMeterFill = sessionCard.querySelector<HTMLElement>("[data-role='session-meter-fill']");
    const sessionFooterText = sessionCard.querySelector<HTMLElement>(".session-card__footer-text");
    const sessionFooterDot = sessionCard.querySelector<HTMLElement>(".session-card__status-dot");
    const levelText = formatLevelPercent(session.level);
    const visualStatus = getVisualStatus(session, true);

    if (sessionStatus) {
      sessionStatus.dataset.state = visualStatus;
      sessionStatus.textContent = statusCopy(visualStatus);
    }

    if (sessionGain) {
      sessionGain.textContent = `${session.gainPercent}%`;
    }

    if (sessionLevel) {
      sessionLevel.textContent = levelText;
    }

    if (sessionLevelMeter) {
      sessionLevelMeter.textContent = levelText;
    }

    if (sessionWarning) {
      sessionWarning.dataset.warning = session.warning;
      sessionWarning.textContent = warningCopy(session.warning);
    }

    if (sessionProtectionAction) {
      sessionProtectionAction.textContent = formatProtectionAction(
        session.protectorActionDb,
        session.protectionBypassed
      );
    }

    if (sessionClipEvents) {
      sessionClipEvents.textContent = String(session.clipEvents);
    }

    if (sessionMeterFill) {
      sessionMeterFill.style.width = `${Math.max(8, Math.round(session.level * 100))}%`;
    }

    if (sessionFooterText) {
      sessionFooterText.textContent = statusCopy(visualStatus);
    }

    if (sessionFooterDot) {
      sessionFooterDot.dataset.state = visualStatus;
    }
  }

  if (laneGrid && laneContentAnimations.length > 0) {
    animateBoosterLaneTransition(laneGrid, previousLaneGridHeight, laneContentAnimations);
  }
}

function createRenderSignature(viewModel: ReturnType<typeof buildPopupViewModel>): string {
  return JSON.stringify({
    transientError: transientError?.key ?? null,
    currentTab: viewModel.currentTab
      ? {
          tabId: viewModel.currentTab.tabId,
          title: viewModel.currentTab.title,
          domain: viewModel.currentTab.domain,
          supported: viewModel.currentTab.supported,
          activeLane: viewModel.currentTab.activeLane,
          autoBoosterScope: viewModel.currentTab.autoBoosterScope,
          autoAttachState: viewModel.currentTab.autoAttachState,
          autoAttachReason: viewModel.currentTab.autoAttachReason
        }
      : null,
    currentSession: viewModel.currentSession
      ? {
          tabId: viewModel.currentSession.tabId,
          lane: viewModel.currentSession.engineLane,
          scope: viewModel.currentSession.autoBoosterScope,
          state: viewModel.currentSession.streamState
        }
      : null,
    currentManualSession: viewModel.currentManualSession ? { tabId: viewModel.currentManualSession.tabId } : null,
    autoBoosterMode: viewModel.autoBoosterMode,
    activeSessions: viewModel.activeSessions.map((session) => ({
      tabId: session.tabId,
      title: session.title,
      domain: session.domain,
      lane: session.engineLane
    }))
  });
}

function clearTransientError(): void {
  if (!transientError) {
    return;
  }

  transientError = null;
  renderedSignature = "";
}

function syncSliderVisuals(slider: HTMLInputElement, animateVisuals = false): void {
  if (animateVisuals && !shouldReduceMotion()) {
    startGainSliderAnimation(draftGainPercent);
    return;
  }

  if (gainSliderAnimationFrame !== null && gainSliderAnimationTarget === draftGainPercent) {
    applyGainSliderVisuals(slider, visualGainPercent);
    return;
  }

  stopGainSliderAnimation();
  visualGainPercent = draftGainPercent;
  applyGainSliderVisuals(slider, visualGainPercent);
}

function startGainSliderAnimation(targetGainPercent: number): void {
  const slider = rootElement.querySelector<HTMLInputElement>("[data-role='gain-slider']");

  if (!slider) {
    return;
  }

  const nextTarget = clampGainPercent(targetGainPercent);
  const origin = gainSliderAnimationFrame !== null ? visualGainPercent : clampGainPercent(visualGainPercent);

  if (Math.abs(origin - nextTarget) < 0.5) {
    stopGainSliderAnimation();
    visualGainPercent = nextTarget;
    applyGainSliderVisuals(slider, visualGainPercent);
    return;
  }

  stopGainSliderAnimation();
  gainSliderAnimationTarget = nextTarget;
  setGainSliderAnimating(true);
  const startedAt = performance.now();

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / GAIN_PRESET_ANIMATION_MS);
    const easedProgress = easeInOutCubic(progress);
    visualGainPercent = origin + (nextTarget - origin) * easedProgress;
    applyGainSliderVisuals(slider, visualGainPercent);

    if (progress < 1) {
      gainSliderAnimationFrame = window.requestAnimationFrame(tick);
      return;
    }

    gainSliderAnimationFrame = null;
    gainSliderAnimationTarget = null;
    visualGainPercent = nextTarget;
    applyGainSliderVisuals(slider, visualGainPercent);
    setGainSliderAnimating(false);
  };

  gainSliderAnimationFrame = window.requestAnimationFrame(tick);
}

function stopGainSliderAnimation(): void {
  if (gainSliderAnimationFrame !== null) {
    window.cancelAnimationFrame(gainSliderAnimationFrame);
    gainSliderAnimationFrame = null;
  }

  gainSliderAnimationTarget = null;
  setGainSliderAnimating(false);
}

function applyGainSliderVisuals(slider: HTMLInputElement, gainPercent: number): void {
  const currentSlider = slider.isConnected
    ? slider
    : rootElement.querySelector<HTMLInputElement>("[data-role='gain-slider']");
  const progress = `${getSliderProgressPercent(gainPercent)}%`;
  const sliderShell = rootElement.querySelector<HTMLElement>("[data-role='gain-slider-shell']");
  const sliderValue = rootElement.querySelector<HTMLElement>("[data-role='slider-value']");

  if (!currentSlider) {
    return;
  }

  currentSlider.style.setProperty("--slider-progress", progress);
  sliderShell?.style.setProperty("--slider-progress", progress);

  if (sliderValue) {
    sliderValue.textContent = `${formatPresetValue(Math.round(gainPercent))}%`;
  }
}

function setGainSliderAnimating(isAnimating: boolean): void {
  const sliderShell = rootElement.querySelector<HTMLElement>("[data-role='gain-slider-shell']");

  if (sliderShell) {
    sliderShell.dataset.animating = String(isAnimating);
  }
}

function shouldReduceMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
}

function easeInOutCubic(progress: number): number {
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }

  return 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function clearPendingGainTrackJump(): void {
  pendingGainTrackJumpAnimationAt = 0;
  pendingGainTrackJumpPointerId = null;
  pendingGainTrackJumpStartX = null;
  pendingGainTrackJumpMoved = false;
}

function animateBoosterLaneTransition(
  laneGrid: HTMLElement,
  previousHeight: number,
  elements: HTMLElement[]
): void {
  if (shouldReduceMotion()) {
    return;
  }

  const nextHeight = laneGrid.getBoundingClientRect().height;

  if (laneLayoutTransitionTimer !== null) {
    window.clearTimeout(laneLayoutTransitionTimer);
    laneLayoutTransitionTimer = null;
  }

  if (Math.abs(nextHeight - previousHeight) > 0.5) {
    laneGrid.style.transition = "none";
    laneGrid.style.height = `${previousHeight}px`;
    laneGrid.style.overflow = "clip";
    void laneGrid.offsetHeight;
    laneGrid.style.transition = `height ${LANE_LAYOUT_TRANSITION_MS}ms ${POPUP_PREMIUM_EASING}`;
    laneGrid.style.height = `${nextHeight}px`;

    laneLayoutTransitionTimer = window.setTimeout(() => {
      laneGrid.style.height = "";
      laneGrid.style.transition = "";
      laneGrid.style.overflow = "";
      laneLayoutTransitionTimer = null;
    }, LANE_LAYOUT_TRANSITION_MS + 40);
  }

  for (const element of elements) {
    element.animate(
      [
        {
          opacity: 0.82,
          transform: POPUP_LANE_TRANSITION_FROM,
          filter: "saturate(0.94)"
        },
        {
          opacity: 1,
          transform: POPUP_LANE_TRANSITION_TO,
          filter: "saturate(1)"
        }
      ],
      {
        duration: LANE_LAYOUT_TRANSITION_MS,
        easing: POPUP_PREMIUM_EASING
      }
    );
  }
}

function getTabContextKey(tab: WorkerState["currentTab"] | undefined): string {
  if (!tab) {
    return "none";
  }

  return `${tab.tabId}|${tab.url ?? ""}|${tab.domain ?? ""}|${tab.supported ? "1" : "0"}`;
}

function getTabIdentityKey(tab: WorkerState["currentTab"] | undefined): string {
  if (!tab) {
    return "none";
  }

  return `${tab.tabId}|${tab.supported ? "1" : "0"}`;
}

function hasManualSessionForActiveTab(state: WorkerState | null | undefined, tabId: number | undefined): boolean {
  if (!state || typeof tabId !== "number") {
    return false;
  }

  return state.sessions.some((session) => session.tabId === tabId && session.engineLane === "manual_tab_capture");
}

function didTabContextChange(previousState: WorkerState | null, nextState: WorkerState): boolean {
  const previousTab = previousState?.currentTab;
  const nextTab = nextState.currentTab;
  const nextTabId = nextTab?.tabId;
  const isSameTab = typeof nextTabId === "number" && previousTab?.tabId === nextTabId;
  const preserveManualNavigationContext =
    isSameTab &&
    (hasManualSessionForActiveTab(previousState, nextTabId) || hasManualSessionForActiveTab(nextState, nextTabId));

  if (preserveManualNavigationContext) {
    return getTabIdentityKey(previousTab) !== getTabIdentityKey(nextTab);
  }

  return getTabContextKey(previousTab) !== getTabContextKey(nextTab);
}

function renderAdvancedControl(key: AdvancedControlKey, value: number, disabled = false): string {
  if (!currentCatalog) {
    return "";
  }

  const config = ADVANCED_CONTROL_CONFIG[key];
  const inputId = `advanced-control-${key}`;
  const tooltipId = `advanced-control-tooltip-${key}`;

  return `
    <div class="advanced-control" style="--advanced-progress:${getAdvancedSliderProgressPercent(key, value)}%">
      <div class="advanced-control__meta">
        <label class="advanced-control__label-row" for="${inputId}">
          <span class="advanced-control__label-text">${escapeHtml(
            translate(currentCatalog, config.labelKey as never)
          )}</span>
          ${renderHelpTrigger(config.helpLabelKey, config.helpTextKey, tooltipId)}
        </label>
        <strong data-role="advanced-value">${escapeHtml(formatAdvancedValue(key, value))}</strong>
      </div>
      <input
        id="${inputId}"
        class="advanced-control__slider"
        data-role="advanced-slider"
        data-advanced-key="${key}"
        type="range"
        min="${config.min}"
        max="${config.max}"
        step="${config.step}"
        value="${value}"
        ${disabled ? "disabled" : ""}
      />
    </div>
  `;
}

function renderTelemetryPillLabel(
  labelKey: string,
  helpLabelKey: string,
  helpTextKey: string,
  tooltipId: string
): string {
  if (!currentCatalog) {
    return "";
  }

  return `
    <div class="telemetry-pill__label-row">
      <span class="telemetry-pill__label-text">${escapeHtml(translate(currentCatalog, labelKey as never))}</span>
      ${renderHelpTrigger(helpLabelKey, helpTextKey, tooltipId)}
    </div>
  `;
}

function renderHelpTrigger(helpLabelKey: string, helpTextKey: string, tooltipId: string): string {
  if (!currentCatalog) {
    return "";
  }

  return `
    <span class="telemetry-pill__help-wrap">
      <button
        class="telemetry-pill__help"
        type="button"
        aria-label="${escapeHtml(translate(currentCatalog, helpLabelKey as never))}"
        aria-describedby="floating-help-tooltip"
      >
        <span aria-hidden="true">?</span>
      </button>
      <span class="telemetry-pill__tooltip" role="tooltip" id="${tooltipId}" aria-hidden="true">
        ${escapeHtml(translate(currentCatalog, helpTextKey as never))}
      </span>
    </span>
  `;
}

function getSliderProgressPercent(gainPercent: number): number {
  return ((clampGainPercent(gainPercent) - MIN_GAIN_PERCENT) / (MAX_GAIN_PERCENT - MIN_GAIN_PERCENT)) * 100;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAppShellScrollTop(): number {
  return rootElement.querySelector<HTMLElement>(".app-shell")?.scrollTop ?? 0;
}

function getFocusedAdvancedControlKey(): string | null {
  const activeElement = document.activeElement;

  if (!(activeElement instanceof HTMLInputElement) || activeElement.dataset.role !== "advanced-slider") {
    return null;
  }

  return activeElement.dataset.advancedKey ?? null;
}

function restoreAppShellUiState(scrollTop: number, focusedAdvancedKey: string | null): void {
  const restore = () => {
    const appShell = rootElement.querySelector<HTMLElement>(".app-shell");

    if (appShell) {
      appShell.scrollTop = scrollTop;
    }

    if (!focusedAdvancedKey) {
      return;
    }

    const advancedSlider = rootElement.querySelector<HTMLInputElement>(
      `[data-role='advanced-slider'][data-advanced-key='${focusedAdvancedKey}']`
    );

    if (advancedSlider && document.activeElement !== advancedSlider) {
      advancedSlider.focus({ preventScroll: true });
    }
  };

  restore();
  window.requestAnimationFrame(restore);
}

function getAdvancedSliderProgressPercent(key: AdvancedControlKey, value: number): number {
  const config = ADVANCED_CONTROL_CONFIG[key];
  return ((value - config.min) / (config.max - config.min)) * 100;
}

function setText(selector: string, value: string): void {
  const element = rootElement.querySelector<HTMLElement>(selector);

  if (element) {
    element.textContent = value;
  }
}

function formatLevelPercent(level: number): string {
  return `${deriveLiveActivityPercent(level)}%`;
}

function statusCopy(state: string): string {
  if (!currentCatalog) {
    return state;
  }

  switch (state) {
    case "pending":
      return translate(currentCatalog, "statusPending");
    case "active":
      return translate(currentCatalog, "statusActive");
    case "error":
      return translate(currentCatalog, "statusError");
    case "unsupported":
      return translate(currentCatalog, "statusUnsupported");
    default:
      return translate(currentCatalog, "statusIdle");
  }
}

function qualityPresetCopy(preset: QualityPreset): string {
  return getQualityPresetCopy(preset, currentCatalog);
}

function qualityPresetSubtitleCopy(preset: QualityPreset): string {
  return getQualityPresetSubtitleCopy(preset, currentCatalog);
}

function qualityProtectorModeCopy(mode: AudioQualityProtectorMode): string {
  return getQualityProtectorModeCopy(mode, currentCatalog);
}

function qualityProtectorButtonCopy(mode: AudioQualityProtectorMode): string {
  return getQualityProtectorButtonCopy(mode, currentCatalog);
}

function qualityProtectorSubtitleCopy(mode: AudioQualityProtectorMode): string {
  return getQualityProtectorSubtitleCopy(mode, currentCatalog);
}

function qualityProtectorStateCopy(protectionBypassed: boolean): string {
  if (!currentCatalog) {
    return protectionBypassed ? "Unprotected" : "Protected";
  }

  return protectionBypassed
    ? translate(currentCatalog, "qualityProtectorBypassedState")
    : translate(currentCatalog, "qualityProtectorProtectedState");
}

function getLaneStatus(viewModel: ReturnType<typeof buildPopupViewModel>): LaneStatusDescriptor {
  if (!currentCatalog) {
    return {
      tone: "idle",
      badge: t("laneBadgeIdle"),
      title: t("laneIdleTitle"),
      detail: t("laneIdleDetail")
    };
  }

  const currentTab = viewModel.currentTab;

  if (!currentTab) {
    return {
      tone: "idle",
      badge: translate(currentCatalog, "laneBadgeIdle"),
      title: translate(currentCatalog, "laneIdleTitle"),
      detail: translate(currentCatalog, "laneIdleDetail")
    };
  }

  if (currentTab.activeLane === "manual_tab_capture") {
    return {
      tone: "manual",
      badge: translate(currentCatalog, "laneBadgeManual"),
      title: translate(currentCatalog, "laneManualTitle"),
      detail: translate(currentCatalog, "laneManualDetail")
    };
  }

  if (currentTab.activeLane === "auto_media_element") {
    return {
      tone: "automatic",
      badge: translate(
        currentCatalog,
        currentTab.autoBoosterScope === "global" ? "laneBadgeAutomaticGlobal" : "laneBadgeAutomaticSite"
      ),
      title: translate(
        currentCatalog,
        currentTab.autoBoosterScope === "global" ? "laneAutomaticGlobalTitle" : "laneAutomaticSiteTitle"
      ),
      detail: translate(
        currentCatalog,
        currentTab.autoBoosterScope === "global"
          ? "laneAutomaticGlobalDetail"
          : "laneAutomaticSiteDetail"
      )
    };
  }

  if (currentTab.autoAttachState === "observing") {
    return {
      tone: "watching",
      badge: translate(currentCatalog, "laneBadgeWatching"),
      title: translate(
        currentCatalog,
        currentTab.autoBoosterScope === "global" ? "laneWatchingGlobalTitle" : "laneWatchingSiteTitle"
      ),
      detail: translate(
        currentCatalog,
        currentTab.autoBoosterScope === "global"
          ? "laneWatchingGlobalDetail"
          : "laneWatchingSiteDetail"
      )
    };
  }

  if (currentTab.autoAttachState === "awaiting_user_gesture") {
    return {
      tone: "watching",
      badge: translate(currentCatalog, "laneBadgeWatching"),
      title: translate(
        currentCatalog,
        currentTab.autoBoosterScope === "global"
          ? "laneInteractionGlobalTitle"
          : "laneInteractionSiteTitle"
      ),
      detail: translate(
        currentCatalog,
        currentTab.autoBoosterScope === "global"
          ? "laneInteractionGlobalDetail"
          : "laneInteractionSiteDetail"
      )
    };
  }

  if (currentTab.autoAttachState === "failed") {
    return {
      tone: "unsupported",
      badge: translate(currentCatalog, "laneBadgeUnavailable"),
      title: translate(currentCatalog, "laneUnsupportedTitle"),
      detail: translate(currentCatalog, "laneUnsupportedDetail")
    };
  }

  if (currentTab.autoAttachState === "unsupported") {
    return {
      tone: "unsupported",
      badge: translate(currentCatalog, "laneBadgeUnavailable"),
      title: translate(currentCatalog, "laneUnsupportedTitle"),
      detail: translate(currentCatalog, "laneUnsupportedDetail")
    };
  }

  if (!currentTab.supported) {
    return {
      tone: "unsupported",
      badge: translate(currentCatalog, "laneBadgeUnavailable"),
      title: translate(currentCatalog, "laneUnsupportedTitle"),
      detail: translate(currentCatalog, "laneUnsupportedDetail")
    };
  }

  if (!viewModel.hasGlobalPermission && viewModel.autoBoosterMode !== "global") {
    return {
      tone: "watching",
      badge: translate(currentCatalog, "laneBadgeAutomaticGlobal"),
      title: translate(currentCatalog, "laneGlobalPermissionTitle"),
      detail: translate(currentCatalog, "laneGlobalPermissionDetail")
    };
  }

  if (viewModel.autoBoosterMode === "global") {
    return {
      tone: "automatic",
      badge: translate(currentCatalog, "laneBadgeAutomaticGlobal"),
      title: translate(currentCatalog, "laneGlobalArmedTitle"),
      detail: translate(currentCatalog, "laneGlobalArmedDetail")
    };
  }

  return {
    tone: "idle",
    badge: translate(currentCatalog, "laneBadgeIdle"),
    title: translate(currentCatalog, "laneIdleTitle"),
    detail: translate(currentCatalog, "laneIdleDetail")
  };
}

function isSiteAutoEnabled(viewModel: ReturnType<typeof buildPopupViewModel>): boolean {
  return viewModel.autoBoosterMode !== "global" && Boolean(viewModel.currentManualSession);
}

function isGlobalAutoEnabled(viewModel: ReturnType<typeof buildPopupViewModel>): boolean {
  return viewModel.autoBoosterMode === "global";
}

function globalBoosterButtonAction(viewModel: ReturnType<typeof buildPopupViewModel>): string {
  if (isGlobalAutoEnabled(viewModel)) {
    return "disable-global-auto";
  }

  return viewModel.hasGlobalPermission ? "enable-global-auto" : "request-global-auto-permission";
}

function renderLaneButtonIcon(kind: LaneButtonCopyKind): string {
  return `
    <span class="ghost-button--lane__icon-badge" aria-hidden="true">
      <span class="ghost-button--lane__icon">
        ${LANE_BUTTON_ICON_MARKUP[kind]}
      </span>
    </span>
  `;
}

function sessionSummaryCopy(count: number): string {
  if (!currentCatalog) {
    return String(count);
  }

  return tp("boostingCount", count, { count });
}

function getVisibleAdvancedAudioSettings(
  viewModel: ReturnType<typeof buildPopupViewModel>
): AdvancedAudioSettings {
  return draftAdvancedAudioSettings ?? pendingAdvancedAudioSettings ?? viewModel.advancedAudioSettings;
}

function formatAdvancedValue(key: AdvancedControlKey, value: number): string {
  return ADVANCED_CONTROL_CONFIG[key].format(value);
}

function formatProtectionAction(value: number, protectionBypassed: boolean): string {
  if (protectionBypassed) {
    return currentCatalog ? translate(currentCatalog, "protectionActionBypassed") : t("protectionActionBypassed");
  }

  return `${Math.max(0, value).toFixed(1)} dB`;
}

function formatClipPeak(value: number): string {
  if (value <= 1) {
    return currentCatalog ? translate(currentCatalog, "clipPeakNone") : t("clipPeakNone");
  }

  return `${Math.round(value * 100)}%`;
}

function formatProtectionLoad(session: CaptureSessionState | null | undefined): string {
  if (!session) {
    return "0%";
  }

  const load = deriveProtectionLoadPercent({
    protectionBypassed: session.protectionBypassed,
    protectorActionDb: session.protectorActionDb,
    inputPeak: session.level,
    outputPeak: session.outputPeak
  });

  return `${load}%`;
}

function formatClippingSafety(outputPeak: number): string {
  const marginDb = deriveClippingSafetyMarginDb(outputPeak);

  if (marginDb === null) {
    return currentCatalog ? translate(currentCatalog, "clippingSafetyIdle") : t("clippingSafetyIdle");
  }

  if (marginDb >= 9.9) {
    return currentCatalog ? translate(currentCatalog, "clippingSafetyMax") : t("clippingSafetyMax");
  }

  return `${marginDb.toFixed(1)} dB`;
}

function getClippingSafetyAlert(outputPeak: number, clipEvents: number): "danger" | "none" {
  const marginDb = deriveClippingSafetyMarginDb(outputPeak);

  if (clipEvents > 0) {
    return "danger";
  }

  if (marginDb !== null && marginDb < 0.8) {
    return "danger";
  }

  return "none";
}

function shouldSyncProtectorTelemetryUi(displayKey: string): boolean {
  const now = performance.now();

  if (
    displayKey !== lastProtectorTelemetryDisplayKey ||
    now - lastProtectorTelemetryUiAt >= PROTECTOR_TELEMETRY_UI_MS
  ) {
    lastProtectorTelemetryDisplayKey = displayKey;
    lastProtectorTelemetryUiAt = now;
    return true;
  }

  return false;
}

function buildPresetToneStyle(value: number): string {
  const normalized = Math.log(value / MIN_GAIN_PERCENT) / Math.log(MAX_GAIN_PERCENT / MIN_GAIN_PERCENT);
  const hue = roundTo(42 - normalized * 34, 2);
  const saturation = roundTo(58 + normalized * 18, 2);
  const topLightness = roundTo(21 + normalized * 6, 2);
  const bottomLightness = roundTo(13 + normalized * 5, 2);
  const borderAlpha = roundTo(0.12 + normalized * 0.2, 3);
  const shadowAlpha = roundTo(0.1 + normalized * 0.14, 3);
  const glowAlpha = roundTo(0.1 + normalized * 0.2, 3);
  const highlightAlpha = roundTo(0.12 + normalized * 0.1, 3);
  const activeTopLightness = roundTo(topLightness + 5, 2);
  const activeBottomLightness = roundTo(bottomLightness + 4, 2);
  const activeBorderAlpha = roundTo(borderAlpha + 0.16, 3);
  const activeGlowAlpha = roundTo(glowAlpha + 0.12, 3);

  return [
    `--preset-bg-top: hsla(${hue}, ${saturation}%, ${topLightness}%, 0.42)`,
    `--preset-bg-bottom: hsla(${hue}, ${Math.min(92, saturation + 6)}%, ${bottomLightness}%, 0.22)`,
    `--preset-border: hsla(${hue}, ${Math.min(96, saturation + 8)}%, 66%, ${borderAlpha})`,
    `--preset-shadow: hsla(${Math.max(0, hue - 4)}, ${Math.min(100, saturation + 10)}%, 18%, ${shadowAlpha})`,
    `--preset-glow: hsla(${hue}, ${Math.min(100, saturation + 10)}%, 58%, ${glowAlpha})`,
    `--preset-highlight: hsla(${Math.max(10, hue - 3)}, ${Math.max(48, saturation - 6)}%, 84%, ${highlightAlpha})`,
    `--preset-text: hsla(${Math.max(18, hue - 6)}, 92%, ${roundTo(95 - normalized * 4, 2)}%, 0.98)`,
    `--preset-active-top: hsla(${hue}, ${Math.min(100, saturation + 18)}%, ${activeTopLightness + 1}%, 1)`,
    `--preset-active-bottom: hsla(${Math.max(4, hue - 2)}, ${Math.min(100, saturation + 22)}%, ${activeBottomLightness + 2}%, 0.69)`,
    `--preset-active-border: hsla(${Math.max(4, hue - 1)}, ${Math.min(100, saturation + 24)}%, 78%, ${roundTo(activeBorderAlpha * 1.5, 3)})`,
    `--preset-active-glow: hsla(${Math.max(0, hue - 3)}, ${Math.min(100, saturation + 18)}%, 56%, ${roundTo(activeGlowAlpha * 1.5, 3)})`
  ].join("; ");
}

function formatPresetValue(value: number): string {
  return new Intl.NumberFormat(loadedLocale ?? getBrowserLocale()).format(value);
}

function areAdvancedSettingsEqual(
  left: AdvancedAudioSettings | null | undefined,
  right: AdvancedAudioSettings | null | undefined
): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.qualityPreset === right.qualityPreset &&
    left.qualityProtectorMode === right.qualityProtectorMode &&
    left.ceilingDb === right.ceilingDb &&
    left.lookaheadMs === right.lookaheadMs &&
    left.releaseMs === right.releaseMs &&
    left.multibandDepth === right.multibandDepth &&
    left.softClipMix === right.softClipMix
  );
}

function rememberSiteCopy(currentTab: NonNullable<WorkerState["currentTab"]>): string {
  const isRemembered =
    currentTab.hasStoredPreference && currentTab.preferredGainPercent === draftGainPercent;

  if (!currentCatalog) {
    return isRemembered
      ? t("forgetSite", { domain: t("siteLabel") })
      : t("rememberSite", { domain: t("siteLabel") });
  }

  return isRemembered
    ? translate(currentCatalog, "forgetSite", { domain: translate(currentCatalog, "siteLabel") })
    : translate(currentCatalog, "rememberSite", { domain: translate(currentCatalog, "siteLabel") });
}

function rememberSiteEmoji(currentTab: NonNullable<WorkerState["currentTab"]>): string {
  return currentTab.hasStoredPreference && currentTab.preferredGainPercent === draftGainPercent ? "❌" : "💾";
}

function confirmCurrentSiteAutoBooster(): boolean {
  if (!currentCatalog) {
    return true;
  }

  const isGlobalEnabled = currentState?.autoBoosterMode === "global";

  return window.confirm(
    `${translate(currentCatalog, "siteAutoWarningTitle")}\n\n${translate(
      currentCatalog,
      isGlobalEnabled ? "siteAutoSwitchWarningBody" : "siteAutoWarningBody"
    )}`
  );
}

function confirmGlobalAutoBooster(): boolean {
  if (!currentCatalog) {
    return true;
  }

  const isSiteEnabled =
    currentState?.currentTab?.autoBoosterScope === "site" && currentState.currentTab.autoAttachState !== "idle";

  return window.confirm(
    `${translate(currentCatalog, "globalAutoWarningTitle")}\n\n${translate(
      currentCatalog,
      isSiteEnabled ? "globalAutoSwitchWarningBody" : "globalAutoWarningBody"
    )}`
  );
}

function triggerBoosterButtonMorph(button: HTMLButtonElement): void {
  button.classList.remove("is-morphing");
  void button.offsetWidth;
  button.classList.add("is-morphing");

  if (boosterButtonMorphTimer !== null) {
    window.clearTimeout(boosterButtonMorphTimer);
  }

  boosterButtonMorphTimer = window.setTimeout(() => {
    if (button.isConnected) {
      button.classList.remove("is-morphing");
    }

    boosterButtonMorphTimer = null;
  }, 900);
}

function syncBoostingBackground(isBoosting: boolean): void {
  document.body.dataset.boosting = String(isBoosting);
}

function getBoosterButtonMode(
  viewModel: ReturnType<typeof buildPopupViewModel>
): "active" | "idle" | "disabled" {
  if (viewModel.currentManualSession) {
    return "active";
  }

  return viewModel.canStart ? "idle" : "disabled";
}

function getVisualStatus(
  session: CaptureSessionState | null | undefined,
  tabSupported: boolean
): string {
  if (!tabSupported) {
    return "unsupported";
  }

  if (!session) {
    return "inactive";
  }

  if (session.engineStatus === "loading") {
    return "pending";
  }

  if (session.engineStatus === "error") {
    return "error";
  }

  return session.streamState;
}

function warningCopy(warning: string): string {
  if (!currentCatalog) {
    return warning;
  }

  switch (warning) {
    case "high":
      return translate(currentCatalog, "warningHigh");
    case "danger":
      return translate(currentCatalog, "warningDanger");
    default:
      return translate(currentCatalog, "warningNone");
  }
}

function renderSiteFavicon(
  label: string,
  domain?: string,
  size: "large" | "small" = "small"
): string {
  const faviconUrl = getDuckDuckGoFaviconUrl(domain);
  const sizeClass = size === "large" ? "site-favicon--large" : "site-favicon--small";
  const glyph = escapeHtml(getSiteGlyph(label, domain));

  return `
    <span
      class="site-favicon ${sizeClass}"
      data-role="site-favicon"
      ${faviconUrl ? 'data-has-image="true"' : ""}
      aria-hidden="true"
    >
      <span class="site-favicon__fallback">${glyph}</span>
      ${
        faviconUrl
          ? `<img
              class="site-favicon__image"
              data-role="site-favicon-image"
              src="${escapeHtml(faviconUrl)}"
              alt=""
              decoding="async"
              referrerpolicy="no-referrer"
            />`
          : ""
      }
    </span>
  `;
}

function getSiteGlyph(label: string, domain?: string): string {
  const candidate = domain || label;
  const match = candidate.match(/[a-z0-9]/i);
  return (match?.[0] || "?").toUpperCase();
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
