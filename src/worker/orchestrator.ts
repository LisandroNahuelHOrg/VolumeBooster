/**
 * @fileoverview Orquestador central del service worker MV3. Coordina captura
 * manual, auto-booster global, offscreen, badges y estado del popup.
 */
import { DEFAULT_GAIN_PERCENT } from "../shared/constants";
import { isProtectionBypassedSettings, sanitizeAdvancedAudioSettings } from "../shared/audio-settings";
import { buildTabSummary, getDomainFromUrl, isSupportedTabUrl } from "../shared/domain";
import { clampGainPercent } from "../shared/gain";
import {
  fail,
  isContentEvent,
  isLocalizedMessage,
  isOffscreenEvent,
  message,
  ok,
  type PopupCommand
} from "../shared/messages";
import { SettingsRepository } from "../shared/storage";
import type {
  AdvancedAudioSettings,
  AutoBoosterDebugState,
  AutoBoosterFrameReadyPayload,
  AutoBoosterConfigPayload,
  AutoBoosterMode,
  AutoBoosterScope,
  AutoBoosterTabState,
  AutoFallbackToastDismissedPayload,
  AutoFrameRuntimeState,
  AutoFrameTarget,
  AutoManualFallbackRequestPayload,
  AutoSessionAttachFailedPayload,
  AutoSessionLevelPayload,
  AutoSessionStatusPayload,
  CaptureSessionState,
  LocalizedMessage,
  OffscreenMetadataPayload,
  RuntimeResponse,
  SessionStatusPayload,
  TabSummary,
  WorkerState
} from "../shared/types";
import { OffscreenClient } from "./offscreen-client";
import { AutoBoosterClient } from "./auto-booster-client";
import { aggregateAutoFrameStates } from "./auto-tab-aggregate";
import { AutoFrameRegistry } from "./auto-frame-registry";

const ACTION_BADGE_TEXT = "🔊";
const ACTION_BADGE_TEXT_COLOR = "#0b0b0b";
const ACTION_BADGE_IDLE_COLOR = "#101214";
const ACTION_BADGE_PULSE_COLOR = "#d72828";
const ACTION_BADGE_AUDIBLE_THRESHOLD = 0.025;
const ACTION_BADGE_AUDIBLE_HOLD_MS = 1500;
const ACTION_BADGE_PULSE_MS = 1000;

interface AutoTabRuntimeState extends AutoBoosterTabState {
  gainPercent: number;
  lastError?: LocalizedMessage;
}

/**
 * Coordina todos los modos de booster y mantiene el estado consolidado de la
 * extensión.
 */
export class WorkerOrchestrator {
  private readonly sessions = new Map<number, CaptureSessionState>();
  private readonly manualSessions = new Map<number, CaptureSessionState>();
  private readonly autoSessions = new Map<number, CaptureSessionState>();
  private readonly autoTabStates = new Map<number, AutoTabRuntimeState>();
  private readonly autoDebugStates = new Map<
    number,
    Pick<AutoBoosterDebugState, "frameCount" | "readyFrameCount" | "attachedFrameCount" | "toastVisible">
  >();
  private readonly autoFrameRegistry = new AutoFrameRegistry();
  private readonly siteEnabledAutoTabs = new Set<number>();
  private readonly autoSuppressedTabs = new Set<number>();
  private readonly badgedTabs = new Set<number>();
  private readonly audibleTabs = new Map<number, number>();
  private badgePulseTimer: ReturnType<typeof globalThis.setInterval> | null = null;
  private badgePulseHighlighted = false;
  private autoBoosterMode: AutoBoosterMode = "off";

  constructor(
    private readonly offscreenClient = new OffscreenClient(),
    private readonly settingsRepository = new SettingsRepository(),
    private readonly now = () => Date.now(),
    private readonly autoBoosterClient = new AutoBoosterClient()
  ) {}

  /**
   * Restaura el estado persistido y vuelve a sincronizar offscreen, auto lane y
   * badges al levantar el worker.
   */
  async bootstrap(): Promise<void> {
    this.autoBoosterMode = await this.settingsRepository.getAutoBoosterMode();

    if (
      this.autoBoosterMode === "global" &&
      typeof this.autoBoosterClient.hasGlobalPermission === "function" &&
      !(await this.autoBoosterClient.hasGlobalPermission())
    ) {
      this.autoBoosterMode = await this.settingsRepository.setAutoBoosterMode("off");
    }

    if (this.autoBoosterMode === "global") {
      await this.registerGlobalContentScripts();
    } else {
      await this.unregisterGlobalContentScripts();
    }

    await this.syncFromOffscreen();

    if (this.autoBoosterMode === "global") {
      await this.syncGlobalAutoBoosterAcrossTabs();
    }

    await this.syncActionBadges();
  }

  /**
   * Punto único de entrada para comandos enviados desde el popup.
   */
  async handlePopupCommand(
    command: PopupCommand
  ): Promise<RuntimeResponse<WorkerState | AutoBoosterDebugState | null>> {
    try {
      switch (command.type) {
        case "GET_STATE":
      case "GET_ADVANCED_AUDIO_SETTINGS":
          return ok(await this.getState());
        case "GET_DEBUG_STATE":
          return ok(await this.getDebugState(command.payload.tabId));
        case "REQUEST_SITE_PERMISSION":
          await this.validateTabForAutoBooster(command.payload.tabId);
          return ok(await this.getState());
        case "REQUEST_GLOBAL_PERMISSION": {
          const granted = await this.autoBoosterClient.requestGlobalPermission();

          if (!granted) {
            return fail(message("errorAutoGlobalPermissionDenied"));
          }

          return ok(await this.getState());
        }
        case "ENABLE_CURRENT_TAB_BOOSTER":
          await this.enableCurrentTabBooster(command.payload.tabId, command.payload.gainPercent);
          return ok(await this.getState());
        case "DISABLE_CURRENT_TAB_BOOSTER":
          await this.disableCurrentTabBooster(command.payload.tabId);
          return ok(await this.getState());
        case "ENABLE_GLOBAL_AUTO_BOOSTER":
          await this.enableGlobalAutoBooster(command.payload.tabId, command.payload.gainPercent);
          return ok(await this.getState());
        case "DISABLE_GLOBAL_AUTO_BOOSTER":
          await this.disableGlobalAutoBooster();
          return ok(await this.getState());
        case "START_CAPTURE":
          await this.startCapture(command.payload.tabId, command.payload.gainPercent);
          return ok(await this.getState());
        case "SET_GAIN":
          await this.setGain(command.payload.tabId, command.payload.gainPercent);
          return ok(await this.getState());
        case "SAVE_DOMAIN_GAIN":
          await this.saveDomainGain(command.payload.tabId, command.payload.gainPercent);
          return ok(await this.getState());
        case "REMOVE_DOMAIN_GAIN":
          await this.removeDomainGain(command.payload.tabId);
          return ok(await this.getState());
        case "SET_ADVANCED_AUDIO_SETTINGS":
          await this.setAdvancedAudioSettings(command.payload);
          return ok(await this.getState());
        case "STOP_CAPTURE":
          await this.stopCapture(command.payload.tabId);
          return ok(await this.getState());
        case "STOP_ALL":
          await this.stopAll();
          return ok(await this.getState());
      }
    } catch (error) {
      return fail(this.toErrorMessage(error));
    }
  }

  private async getDebugState(tabId: number): Promise<AutoBoosterDebugState | null> {
    const liveDebugState = await this.autoBoosterClient.getDebugState(tabId).catch(() => null);
    const cachedDebugState = this.buildCachedAutoDebugState(tabId);

    if (!cachedDebugState) {
      return liveDebugState;
    }

    if (!liveDebugState) {
      return cachedDebugState;
    }

    return {
      ...liveDebugState,
      tabId: cachedDebugState.tabId,
      enabled: cachedDebugState.enabled,
      suspended: cachedDebugState.suspended,
      scope: cachedDebugState.scope,
      attachState: cachedDebugState.attachState,
      attachReason: cachedDebugState.attachReason,
      ...(cachedDebugState.activeStrategy ? { activeStrategy: cachedDebugState.activeStrategy } : {}),
      attachedElementCount: Math.max(liveDebugState.attachedElementCount, cachedDebugState.attachedElementCount),
      frameCount: cachedDebugState.frameCount,
      readyFrameCount: cachedDebugState.readyFrameCount,
      attachedFrameCount: cachedDebugState.attachedFrameCount,
      toastVisible: cachedDebugState.toastVisible,
      lastLevel: cachedDebugState.lastLevel,
      lastError: cachedDebugState.lastError ?? liveDebugState.lastError,
      currentUrl: cachedDebugState.currentUrl ?? liveDebugState.currentUrl
    };
  }

  private buildCachedAutoDebugState(tabId: number): AutoBoosterDebugState | null {
    const autoState = this.autoTabStates.get(tabId);

    if (!autoState) {
      return null;
    }

    const debugState = this.autoDebugStates.get(tabId);

    return {
      tabId,
      lane: "auto_media_element",
      enabled: true,
      suspended: this.autoSuppressedTabs.has(tabId) || this.manualSessions.has(tabId),
      scope: autoState.autoBoosterScope ?? null,
      attachState: autoState.autoAttachState,
      attachReason: autoState.autoAttachReason,
      ...(autoState.autoActiveStrategy && autoState.autoActiveStrategy !== "none"
        ? { activeStrategy: autoState.autoActiveStrategy }
        : {}),
      audioContextState: "none",
      autoplayPolicy: undefined,
      mediaElementCount: 0,
      attachedElementCount: this.autoSessions.has(tabId) ? 1 : 0,
      frameCount: debugState?.frameCount ?? 0,
      readyFrameCount: debugState?.readyFrameCount ?? 0,
      attachedFrameCount: debugState?.attachedFrameCount ?? 0,
      toastVisible: debugState?.toastVisible ?? false,
      lastTelemetryAt: null,
      lastLevel: this.autoSessions.get(tabId)?.level ?? 0,
      lastError: autoState.lastError,
      lastTechnicalError: undefined,
      currentUrl: autoState.url
    };
  }

  /**
   * Reenvía eventos del documento offscreen y del content script automático al
   * handler interno correspondiente.
   */
  async handleBackgroundEvent(
    incomingMessage: unknown,
    sender?: chrome.runtime.MessageSender
  ): Promise<void> {
    if (isOffscreenEvent(incomingMessage)) {
      await this.handleOffscreenEvent(incomingMessage);
      return;
    }

    if (isContentEvent(incomingMessage)) {
      await this.handleContentEvent(incomingMessage, sender);
    }
  }

  /**
   * Reacciona a navegación/recarga de tabs y re-sincroniza el lane correcto.
   */
  async handleTabUpdated(
    tabId: number,
    changeInfo: { status?: string; url?: string },
    tab: chrome.tabs.Tab
  ): Promise<void> {
    const didNavigate = Boolean(changeInfo.url) || changeInfo.status === "loading";

    if (didNavigate) {
      this.resetNavigationScopedAutoState(tabId);
    }

    if (this.manualSessions.has(tabId)) {
      const domain = getDomainFromUrl(tab.url);

      if (!isSupportedTabUrl(tab.url)) {
        await this.stopCapture(tabId);
        return;
      }

      const preferredGain = (await this.settingsRepository.getDomainGain(domain)) ?? DEFAULT_GAIN_PERCENT;
      const advancedAudioSettings = await this.settingsRepository.getAdvancedAudioSettings();
      const payload: OffscreenMetadataPayload = {
        tabId,
        title: tab.title || tab.url || "",
        url: tab.url,
        domain,
        favIconUrl: tab.favIconUrl,
        gainPercent: preferredGain,
        advancedAudioSettings
      };

      const snapshot = await this.offscreenClient.updateMetadata(payload);
      this.replaceManualSessions(snapshot);
    }

    if (this.autoBoosterMode === "global") {
      if (!tab.id || !isSupportedTabUrl(tab.url)) {
        this.markAutoUnsupported(tab, "global");
      } else if (changeInfo.status === "complete" || changeInfo.url) {
        await this.activateAutoBoosterForTab(tab, "global");
      }
    }

    await this.broadcastState();
  }

  /**
   * Re-sincroniza el modo global al cambiar la pestaña activa.
   */
  async handleTabActivated(activeInfo: { tabId: number }): Promise<void> {
    if (this.autoBoosterMode === "global") {
      const activeTab = await chrome.tabs.get(activeInfo.tabId);

      if (activeTab.id && isSupportedTabUrl(activeTab.url)) {
        await this.activateAutoBoosterForTab(activeTab, "global");
      }
    }

    await this.broadcastState();
  }

  /**
   * Limpia por completo el estado asociado a una pestaña cerrada.
   */
  async handleTabRemoved(tabId: number): Promise<void> {
    if (this.manualSessions.has(tabId)) {
      await this.stopManualCapture(tabId);
    }

    this.siteEnabledAutoTabs.delete(tabId);
    this.autoSuppressedTabs.delete(tabId);
    this.autoSessions.delete(tabId);
    this.autoTabStates.delete(tabId);
    this.autoDebugStates.delete(tabId);
    this.autoFrameRegistry.clearTab(tabId);
    this.rebuildEffectiveSessions();
    await this.broadcastState();
  }

  /**
   * Actualiza el estado de una captura manual cuando `chrome.tabCapture`
   * reporta cambios.
   */
  async handleCaptureStatusChanged(info: chrome.tabCapture.CaptureInfo): Promise<void> {
    if (typeof info.tabId !== "number" || !this.manualSessions.has(info.tabId)) {
      return;
    }

    this.applyManualStatusUpdate({
      tabId: info.tabId,
      streamState: info.status === "active" ? "active" : info.status === "pending" ? "pending" : "inactive",
      engineStatus: info.status === "pending" ? "loading" : "ready",
      gainPercent: this.manualSessions.get(info.tabId)?.gainPercent ?? DEFAULT_GAIN_PERCENT,
      lastError: info.status === "stopped" ? message("errorCaptureStopped") : undefined
    });
    await this.broadcastState();
  }

  private async handleOffscreenEvent(
    incomingMessage: Extract<Parameters<typeof isOffscreenEvent>[0], unknown>
  ): Promise<void> {
    if (!isOffscreenEvent(incomingMessage)) {
      return;
    }

    switch (incomingMessage.type) {
      case "SESSION_LEVEL_UPDATE": {
        const currentSession = this.manualSessions.get(incomingMessage.payload.tabId);

        if (!currentSession) {
          return;
        }

        currentSession.level = incomingMessage.payload.level;
        currentSession.warning = incomingMessage.payload.warning;
        currentSession.protectorActionDb = incomingMessage.payload.protectorActionDb;
        currentSession.clipEvents = incomingMessage.payload.clipEvents;
        currentSession.clipPeak = incomingMessage.payload.clipPeak;
        currentSession.protectionBypassed = incomingMessage.payload.protectionBypassed;
        currentSession.outputPeak = incomingMessage.payload.outputPeak;
        currentSession.updatedAt = this.now();
        this.rebuildEffectiveSessions();

        if (this.updateAudibleState(incomingMessage.payload.tabId, incomingMessage.payload.level)) {
          await this.syncActionBadges();
        }
        return;
      }
      case "SESSION_STATUS_UPDATE":
        this.applyManualStatusUpdate(incomingMessage.payload);
        await this.broadcastState();
        return;
      case "OFFSCREEN_SNAPSHOT":
        this.replaceManualSessions(incomingMessage.payload.sessions);
        await this.broadcastState();
        return;
    }
  }

  private async handleContentEvent(
    incomingMessage: Extract<Parameters<typeof isContentEvent>[0], unknown>,
    sender?: chrome.runtime.MessageSender
  ): Promise<void> {
    if (!isContentEvent(incomingMessage)) {
      return;
    }

    switch (incomingMessage.type) {
      case "AUTO_BOOSTER_FRAME_READY":
        await this.handleAutoFrameReady(incomingMessage.payload, sender);
        await this.broadcastState();
        return;
      case "AUTO_SESSION_STATUS_UPDATE":
        this.applyAutoStatusUpdate(incomingMessage.payload, sender);
        await this.syncFallbackToastForTab(incomingMessage.payload.tabId);
        await this.broadcastState();
        return;
      case "AUTO_SESSION_LEVEL_UPDATE":
        this.applyAutoLevelUpdate(incomingMessage.payload, sender);
        await this.syncFallbackToastForTab(incomingMessage.payload.tabId);
        await this.broadcastState();
        return;
      case "AUTO_SESSION_ATTACH_FAILED":
        this.applyAutoAttachFailure(incomingMessage.payload, sender);
        await this.syncFallbackToastForTab(incomingMessage.payload.tabId);
        await this.broadcastState();
        return;
      case "AUTO_MANUAL_FALLBACK_REQUESTED":
        await this.handleManualFallbackRequest(incomingMessage.payload, sender);
        await this.broadcastState();
        return;
      case "AUTO_FALLBACK_TOAST_DISMISSED":
        this.handleFallbackToastDismissed(incomingMessage.payload, sender);
        await this.broadcastState();
        return;
    }
  }

  /**
   * Devuelve el estado agregado consumido por el popup.
   */
  private async getState(): Promise<WorkerState> {
    await this.syncFromOffscreen();
    const currentTab = await this.getCurrentTabSummary();
    const advancedAudioSettings = await this.settingsRepository.getAdvancedAudioSettings();
    const globalAutoGainPercent = await this.settingsRepository.getGlobalAutoGainPercent();
    const hasGlobalPermission =
      typeof this.autoBoosterClient.hasGlobalPermission === "function"
        ? await this.autoBoosterClient.hasGlobalPermission()
        : false;

    return {
      currentTab,
      advancedAudioSettings,
      autoBoosterMode: this.autoBoosterMode,
      globalAutoGainPercent,
      hasGlobalPermission,
      sessions: [...this.sessions.values()],
      generatedAt: this.now()
    };
  }

  private async broadcastState(): Promise<WorkerState> {
    const state = await this.getState();
    await this.syncActionBadges();

    try {
      await chrome.runtime.sendMessage({ type: "WORKER_STATE_UPDATE", payload: state });
    } catch {
      // The popup may be closed; that is fine.
    }

    return state;
  }

  private async getCurrentTabSummary(): Promise<TabSummary | null> {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!currentTab?.id) {
      return null;
    }

    const domain = getDomainFromUrl(currentTab.url);
    const preferredGain = (await this.settingsRepository.getDomainGain(domain)) ?? DEFAULT_GAIN_PERCENT;
    const summary = buildTabSummary(currentTab, preferredGain, preferredGain !== DEFAULT_GAIN_PERCENT);
    const tabId = currentTab.id;
    const activeSession = this.sessions.get(tabId);
    const autoTabState = this.autoTabStates.get(tabId);

    return {
      ...summary,
      activeLane: activeSession?.engineLane,
      autoBoosterScope: activeSession?.autoBoosterScope ?? autoTabState?.autoBoosterScope,
      autoActiveStrategy: activeSession?.autoActiveStrategy ?? autoTabState?.autoActiveStrategy,
      autoAttachState:
        activeSession?.engineLane === "auto_media_element"
          ? activeSession.autoAttachState
          : autoTabState?.autoAttachState ?? "idle",
      autoAttachReason:
        activeSession?.engineLane === "auto_media_element"
          ? activeSession.autoAttachReason
          : autoTabState?.autoAttachReason
    };
  }

  /**
   * Inicia una captura robusta manual usando `tabCapture`.
   */
  private async startCapture(tabId: number, gainPercent: number): Promise<void> {
    const targetTab = await chrome.tabs.get(tabId);

    if (!targetTab.id) {
      throw message("errorTabNoLongerExists");
    }

    if (!isSupportedTabUrl(targetTab.url)) {
      throw message("errorTabNotCapturable");
    }

    const domain = getDomainFromUrl(targetTab.url);
    const nextGain = clampGainPercent(gainPercent);
    const advancedAudioSettings = await this.settingsRepository.getAdvancedAudioSettings();
    const provisionalSession: CaptureSessionState = {
      tabId,
      title: targetTab.title || targetTab.url || "",
      url: targetTab.url,
      domain,
      favIconUrl: targetTab.favIconUrl,
      gainPercent: nextGain,
      engineLane: "manual_tab_capture",
      autoAttachState: "idle",
      streamState: "pending",
      engineStatus: "loading",
      level: 0,
      warning: "none",
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: isProtectionBypassedSettings(advancedAudioSettings),
      outputPeak: 0,
      updatedAt: this.now()
    };

    this.manualSessions.set(tabId, provisionalSession);
    this.rebuildEffectiveSessions();
    await this.pauseAutoLaneForManual(tabId);
    await this.broadcastState();

    try {
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
      const snapshot = await this.offscreenClient.startSession({
        tabId,
        streamId,
        gainPercent: nextGain,
        advancedAudioSettings,
        title: provisionalSession.title,
        url: provisionalSession.url,
        domain,
        favIconUrl: provisionalSession.favIconUrl
      });

      this.replaceManualSessions(snapshot);
      await this.broadcastState();
    } catch (error) {
      this.manualSessions.delete(tabId);
      this.rebuildEffectiveSessions();
      await this.resumeAutoLaneIfNeeded(tabId);
      await this.broadcastState();
      throw error;
    }
  }

  /**
   * Actualiza el gain del lane activo correspondiente para la pestaña.
   */
  private async setGain(tabId: number, gainPercent: number): Promise<void> {
    const nextGain = clampGainPercent(gainPercent);
    const autoScope = this.getAutoScopeForTab(tabId);

    if (this.manualSessions.has(tabId)) {
      const snapshot = await this.offscreenClient.setGain(tabId, nextGain);
      this.replaceManualSessions(snapshot);
    }

    if (autoScope === "global" && !this.manualSessions.has(tabId)) {
      await this.settingsRepository.setGlobalAutoGainPercent(nextGain);
      await this.syncGlobalAutoBoosterGain(nextGain);
    } else if (this.shouldAutoRemainEnabled(tabId)) {
      const targetTab = await chrome.tabs.get(tabId).catch(() => null);

      if (targetTab?.id && isSupportedTabUrl(targetTab.url)) {
        await this.activateAutoBoosterForTab(
          targetTab,
          autoScope ?? (this.autoBoosterMode === "global" ? "global" : "site"),
          nextGain
        );
      }
    }

    await this.broadcastState();
  }

  /**
   * Persiste un gain por dominio para el sitio actual.
   */
  private async saveDomainGain(tabId: number, gainPercent: number): Promise<void> {
    const targetTab = await chrome.tabs.get(tabId);
    const domain = getDomainFromUrl(targetTab.url);

    if (!domain) {
      throw message("errorRememberUnavailable");
    }

    await this.settingsRepository.setDomainGain(domain, clampGainPercent(gainPercent));
    await this.broadcastState();
  }

  /**
   * Elimina la preferencia de gain guardada para el sitio actual.
   */
  private async removeDomainGain(tabId: number): Promise<void> {
    const targetTab = await chrome.tabs.get(tabId);
    const domain = getDomainFromUrl(targetTab.url);

    if (!domain) {
      throw message("errorForgetUnavailable");
    }

    await this.settingsRepository.removeDomainGain(domain);
    await this.broadcastState();
  }

  /**
   * Persiste y propaga los advanced settings globales a todos los lanes activos.
   */
  private async setAdvancedAudioSettings(partialSettings: Partial<AdvancedAudioSettings>): Promise<void> {
    const persistedSettings = await this.settingsRepository.setAdvancedAudioSettings(
      sanitizeAdvancedAudioSettings({
        ...(await this.settingsRepository.getAdvancedAudioSettings()),
        ...partialSettings
      })
    );

    if (this.manualSessions.size > 0) {
      const snapshot = await this.offscreenClient.setAdvancedAudioSettings(persistedSettings);
      this.replaceManualSessions(snapshot);
    }

    await this.syncConfiguredAutoTabs(persistedSettings);
    await this.broadcastState();
  }

  private async syncFromOffscreen(): Promise<void> {
    const snapshot = await this.offscreenClient.getSnapshot();

    if (snapshot.length > 0 || this.manualSessions.size === 0) {
      this.replaceManualSessions(snapshot);
    }
  }

  /**
   * Detiene la captura o auto-sesión efectiva de una pestaña concreta.
   */
  private async stopCapture(tabId: number): Promise<void> {
    if (this.manualSessions.has(tabId)) {
      await this.stopManualCapture(tabId);
      await this.resumeAutoLaneIfNeeded(tabId);
      await this.broadcastState();
      return;
    }

    if (this.autoSessions.has(tabId) || this.autoTabStates.has(tabId) || this.siteEnabledAutoTabs.has(tabId)) {
      await this.stopAutoForTab(tabId);
      await this.broadcastState();
    }
  }

  private async stopAll(): Promise<void> {
    if (this.manualSessions.size > 0) {
      const snapshot = await this.offscreenClient.stopAll();
      this.replaceManualSessions(snapshot);
      await this.offscreenClient.closeIfIdle(snapshot.length);
    }

    const autoTabIds = new Set<number>([
      ...this.autoSessions.keys(),
      ...this.autoTabStates.keys(),
      ...this.siteEnabledAutoTabs.values()
    ]);

    for (const tabId of autoTabIds) {
      await this.stopAutoForTab(tabId);
    }

    await this.broadcastState();
  }

  private async stopManualCapture(tabId: number): Promise<void> {
    const snapshot = await this.offscreenClient.stopSession(tabId);
    this.replaceManualSessions(snapshot);
    await this.offscreenClient.closeIfIdle(snapshot.length);
  }

  private replaceManualSessions(sessions: CaptureSessionState[]): void {
    this.manualSessions.clear();

    for (const session of sessions) {
      this.manualSessions.set(session.tabId, this.normalizeManualSession(session));
    }

    this.rebuildEffectiveSessions();
  }

  private applyManualStatusUpdate(update: SessionStatusPayload): void {
    const currentSession = this.manualSessions.get(update.tabId);

    if (!currentSession) {
      return;
    }

    currentSession.streamState = update.streamState;
    currentSession.engineStatus = update.engineStatus;
    currentSession.gainPercent = update.gainPercent;
    currentSession.lastError = update.lastError;
    currentSession.updatedAt = this.now();

    if (update.streamState !== "active") {
      this.audibleTabs.delete(update.tabId);
      this.syncBadgePulseTimer();
    }

    this.rebuildEffectiveSessions();
  }

  private applyAutoStatusUpdate(
    update: AutoSessionStatusPayload,
    sender?: chrome.runtime.MessageSender
  ): void {
    const target = this.resolveFrameTarget(sender, update);
    const existingState = this.autoFrameRegistry.getFrameState(update.tabId, target);
    const nextState: AutoFrameRuntimeState = {
      ...(existingState ?? this.createEmptyFrameRuntimeState(update.tabId, target, update)),
      ...update,
      frameId: target.frameId,
      documentId: target.documentId,
      isTopFrame: update.isTopFrame ?? target.frameId === 0,
      frameUrl: update.frameUrl ?? sender?.url ?? update.url,
      ready: true
    };

    this.autoFrameRegistry.updateFrameState(nextState);
    this.recomputeAutoTabAggregation(update.tabId);
  }

  private applyAutoLevelUpdate(
    update: AutoSessionLevelPayload,
    sender?: chrome.runtime.MessageSender
  ): void {
    const target = this.resolveFrameTarget(sender, update);
    const existingState = this.autoFrameRegistry.getFrameState(update.tabId, target);

    if (!existingState) {
      return;
    }

    this.autoFrameRegistry.updateFrameState({
      ...existingState,
      level: update.level,
      warning: update.warning,
      protectorActionDb: update.protectorActionDb,
      clipEvents: update.clipEvents,
      clipPeak: update.clipPeak,
      protectionBypassed: update.protectionBypassed,
      outputPeak: update.outputPeak,
      ready: true
    });
    this.recomputeAutoTabAggregation(update.tabId);
    this.updateAudibleState(update.tabId, update.level);
  }

  private applyAutoAttachFailure(
    update: AutoSessionAttachFailedPayload,
    sender?: chrome.runtime.MessageSender
  ): void {
    const target = this.resolveFrameTarget(sender, update);
    const existingState = this.autoFrameRegistry.getFrameState(update.tabId, target);

    this.autoFrameRegistry.updateFrameState({
      ...(existingState ?? this.createEmptyFrameRuntimeState(update.tabId, target, update)),
      ...update,
      frameId: target.frameId,
      documentId: target.documentId,
      isTopFrame: update.isTopFrame ?? target.frameId === 0,
      frameUrl: update.frameUrl ?? sender?.url ?? update.url,
      autoAttachState: "failed",
      ready: true
    });
    this.audibleTabs.delete(update.tabId);
    this.syncBadgePulseTimer();
    this.recomputeAutoTabAggregation(update.tabId);
  }

  private createEmptyFrameRuntimeState(
    tabId: number,
    target: AutoFrameTarget,
    update: Pick<AutoSessionStatusPayload, "title" | "url" | "domain" | "favIconUrl" | "gainPercent"> &
      Partial<Pick<AutoSessionStatusPayload, "autoBoosterScope" | "autoActiveStrategy" | "lastError">>
  ): AutoFrameRuntimeState {
    return {
      tabId,
      frameId: target.frameId,
      documentId: target.documentId,
      isTopFrame: target.frameId === 0,
      frameUrl: update.url,
      title: update.title,
      url: update.url,
      domain: update.domain,
      favIconUrl: update.favIconUrl,
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      autoBoosterScope: update.autoBoosterScope,
      autoActiveStrategy: update.autoActiveStrategy ?? "none",
      gainPercent: update.gainPercent,
      ready: true,
      streamState: "inactive",
      engineStatus: "ready",
      level: 0,
      warning: "none",
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: false,
      outputPeak: 0,
      lastError: update.lastError
    };
  }

  private recomputeAutoTabAggregation(tabId: number): void {
    const aggregated = aggregateAutoFrameStates(tabId, this.autoFrameRegistry.getFrameStates(tabId), this.now);

    if (!aggregated) {
      this.autoSessions.delete(tabId);
      this.autoTabStates.delete(tabId);
      this.autoDebugStates.delete(tabId);
      this.audibleTabs.delete(tabId);
      this.rebuildEffectiveSessions();
      return;
    }

    this.autoTabStates.set(tabId, aggregated.tabState);
    this.autoDebugStates.set(tabId, aggregated.debug);

    if (aggregated.session) {
      this.autoSessions.set(tabId, aggregated.session);
    } else {
      this.autoSessions.delete(tabId);
      this.audibleTabs.delete(tabId);
      this.syncBadgePulseTimer();
    }

    this.rebuildEffectiveSessions();
  }

  private resolveFrameTarget(
    sender: chrome.runtime.MessageSender | undefined,
    payload: Partial<Pick<AutoSessionStatusPayload, "frameId" | "documentId">>
  ): AutoFrameTarget {
    return {
      frameId: sender?.frameId ?? payload.frameId ?? 0,
      documentId: sender?.documentId ?? payload.documentId
    };
  }

  private async handleAutoFrameReady(
    payload: AutoBoosterFrameReadyPayload,
    sender?: chrome.runtime.MessageSender
  ): Promise<void> {
    const tabId = sender?.tab?.id ?? payload.tabId;

    if (typeof tabId !== "number") {
      return;
    }

    const target = this.resolveFrameTarget(sender, payload);
    this.autoFrameRegistry.upsertKnownFrame({
      tabId,
      frameId: target.frameId,
      documentId: target.documentId,
      isTopFrame: payload.isTopFrame ?? target.frameId === 0,
      frameUrl: payload.frameUrl ?? sender?.url ?? payload.url,
      ready: true
    });

    if (!this.autoFrameRegistry.getFrameState(tabId, target)) {
      this.autoFrameRegistry.updateFrameState({
        tabId,
        frameId: target.frameId,
        documentId: target.documentId,
        isTopFrame: payload.isTopFrame ?? target.frameId === 0,
        frameUrl: payload.frameUrl ?? sender?.url ?? payload.url,
        title: payload.title,
        url: payload.url,
        domain: payload.domain,
        favIconUrl: payload.favIconUrl,
        autoAttachState: "observing",
        autoAttachReason: "no_media",
        autoBoosterScope: this.getAutoScopeForTab(tabId),
        autoActiveStrategy: "none",
        gainPercent:
          this.autoTabStates.get(tabId)?.gainPercent ??
          (this.autoBoosterMode === "global"
            ? await this.settingsRepository.getGlobalAutoGainPercent()
            : DEFAULT_GAIN_PERCENT),
        ready: true,
        streamState: "inactive",
        engineStatus: "ready",
        level: 0,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      });
      this.recomputeAutoTabAggregation(tabId);
    }

    const scope = this.getAutoScopeForTab(tabId);

    if (!scope || this.autoSuppressedTabs.has(tabId)) {
      return;
    }

    const advancedAudioSettings = await this.settingsRepository.getAdvancedAudioSettings();
    const gainPercent =
      this.autoTabStates.get(tabId)?.gainPercent ??
      (scope === "global"
        ? await this.settingsRepository.getGlobalAutoGainPercent()
        : DEFAULT_GAIN_PERCENT);

    try {
      await this.autoBoosterClient.configure(
        tabId,
        {
          tabId,
          scope,
          enabled: true,
          suspended: this.manualSessions.has(tabId) || this.autoSuppressedTabs.has(tabId),
          gainPercent,
          advancedAudioSettings
        },
        target
      );
    } catch (error) {
      const localizedError = this.toErrorMessage(error);
      this.autoFrameRegistry.updateFrameState({
        ...(this.autoFrameRegistry.getFrameState(tabId, target) ??
          this.createEmptyFrameRuntimeState(tabId, target, {
            title: payload.title,
            url: payload.url,
            domain: payload.domain,
            favIconUrl: payload.favIconUrl,
            gainPercent,
            autoBoosterScope: scope,
            lastError: localizedError
          })),
        tabId,
        frameId: target.frameId,
        documentId: target.documentId,
        isTopFrame: payload.isTopFrame ?? target.frameId === 0,
        frameUrl: payload.frameUrl ?? sender?.url ?? payload.url,
        autoAttachState: localizedError.key === "errorAutoPermissionMissing" ? "failed" : "failed",
        autoAttachReason:
          localizedError.key === "errorAutoPermissionMissing" ? "permission_missing" : "attach_failed",
        autoBoosterScope: scope,
        gainPercent,
        lastError: localizedError,
        ready: true
      });
      this.recomputeAutoTabAggregation(tabId);
    }
  }

  private async handleManualFallbackRequest(
    payload: AutoManualFallbackRequestPayload,
    sender?: chrome.runtime.MessageSender
  ): Promise<void> {
    const tabId = sender?.tab?.id ?? payload.tabId;

    if (typeof tabId !== "number") {
      return;
    }

    const target = this.resolveFrameTarget(sender, payload);
    const gainPercent =
      this.autoSessions.get(tabId)?.gainPercent ??
      this.autoTabStates.get(tabId)?.gainPercent ??
      (await this.settingsRepository.getGlobalAutoGainPercent());

    await this.deactivateGlobalAutoBooster();

    try {
      await this.startCapture(tabId, gainPercent);
      await this.hideFallbackToastForTab(tabId, target);
    } catch (error) {
      await this.showFallbackToastForTab(tabId, target, payload.reason, this.toErrorMessage(error));
    }
  }

  private handleFallbackToastDismissed(
    payload: AutoFallbackToastDismissedPayload,
    sender?: chrome.runtime.MessageSender
  ): void {
    const tabId = sender?.tab?.id ?? payload.tabId;

    if (typeof tabId !== "number") {
      return;
    }

    const target = this.resolveFrameTarget(sender, payload);
    this.autoFrameRegistry.markToastDismissed(tabId, target, true);
    this.autoFrameRegistry.markToastVisible(tabId, target, false);
    this.recomputeAutoTabAggregation(tabId);
  }

  private async syncFallbackToastForTab(tabId: number): Promise<void> {
    const scope = this.autoTabStates.get(tabId)?.autoBoosterScope;
    const topFrame = this.autoFrameRegistry.getTopFrame(tabId);
    const tabState = this.autoTabStates.get(tabId);

    if (
      !topFrame ||
      scope !== "global" ||
      this.autoBoosterMode !== "global" ||
      this.manualSessions.has(tabId) ||
      !tabState ||
      tabState.autoAttachState !== "failed" ||
      this.autoSessions.has(tabId) ||
      this.autoFrameRegistry.isToastDismissed(tabId, topFrame)
    ) {
      await this.hideFallbackToastForTab(tabId, topFrame ?? { frameId: 0 });
      return;
    }

    await this.showFallbackToastForTab(
      tabId,
      topFrame,
      tabState.autoAttachReason ?? "attach_failed",
      tabState.lastError
    );
  }

  private async showFallbackToastForTab(
    tabId: number,
    target: AutoFrameTarget,
    reason: NonNullable<AutoTabRuntimeState["autoAttachReason"]>,
    errorMessage?: LocalizedMessage
  ): Promise<void> {
    if (typeof this.autoBoosterClient.sendMessageToFrame === "function") {
      await this.autoBoosterClient.sendMessageToFrame(tabId, target, {
        type: "AUTO_BOOSTER_SHOW_FALLBACK_TOAST",
        payload: {
          tabId,
          documentId: target.documentId,
          reason,
          errorMessage
        }
      });
    }
    this.autoFrameRegistry.markToastVisible(tabId, target, true);
    this.recomputeAutoTabAggregation(tabId);
  }

  private async hideFallbackToastForTab(tabId: number, target: AutoFrameTarget): Promise<void> {
    try {
      if (typeof this.autoBoosterClient.sendMessageToFrame === "function") {
        await this.autoBoosterClient.sendMessageToFrame(tabId, target, {
          type: "AUTO_BOOSTER_HIDE_FALLBACK_TOAST",
          payload: {
            tabId,
            documentId: target.documentId
          }
        });
      }
    } catch {
      // Missing receiver is acceptable during navigation or teardown.
    }

    this.autoFrameRegistry.markToastVisible(tabId, target, false);
    this.recomputeAutoTabAggregation(tabId);
  }

  private normalizeManualSession(session: CaptureSessionState): CaptureSessionState {
    return {
      ...session,
      engineLane: "manual_tab_capture",
      autoAttachState: "idle",
      autoAttachReason: undefined
    };
  }

  private createEmptyAutoSession(update: AutoSessionStatusPayload): CaptureSessionState {
    return {
      tabId: update.tabId,
      title: update.title,
      url: update.url,
      domain: update.domain,
      favIconUrl: update.favIconUrl,
      gainPercent: update.gainPercent,
      engineLane: "auto_media_element",
      autoBoosterScope: update.autoBoosterScope,
      autoActiveStrategy: update.autoActiveStrategy,
      autoAttachState: update.autoAttachState,
      autoAttachReason: update.autoAttachReason,
      streamState: update.streamState,
      engineStatus: update.engineStatus,
      level: 0,
      warning: "none",
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: false,
      outputPeak: 0,
      updatedAt: this.now(),
      lastError: update.lastError
    };
  }

  private rebuildEffectiveSessions(): void {
    this.sessions.clear();

    for (const session of this.autoSessions.values()) {
      this.sessions.set(session.tabId, { ...session });
    }

    for (const session of this.manualSessions.values()) {
      this.sessions.set(session.tabId, { ...session });
    }

    this.pruneAudibleTabs();
    this.syncBadgePulseTimer();
  }

  /**
   * Activa el modo `Single Tab` garantizado para la pestaña actual.
   */
  private async enableCurrentTabBooster(tabId: number, gainPercent: number): Promise<void> {
    if (this.autoBoosterMode === "global") {
      await this.deactivateGlobalAutoBooster();
    }

    await this.disableAllSiteAutoTabs();
    await this.startCapture(tabId, gainPercent);
  }

  private async disableCurrentTabBooster(tabId: number): Promise<void> {
    await this.stopCapture(tabId);
  }

  /**
   * Activa el modo global `All sites` y configura la pestaña actual y futuras.
   */
  private async enableGlobalAutoBooster(currentTabId: number, gainPercent: number): Promise<void> {
    const granted = await this.autoBoosterClient.requestGlobalPermission();

    if (!granted) {
      throw message("errorAutoGlobalPermissionDenied");
    }

    await this.disableAllSiteAutoTabs();
    await this.registerGlobalContentScripts();

    if (this.manualSessions.has(currentTabId)) {
      await this.stopManualCapture(currentTabId);
    }

    this.autoBoosterMode = await this.settingsRepository.setAutoBoosterMode("global");
    const globalGainPercent = await this.settingsRepository.setGlobalAutoGainPercent(gainPercent);
    this.autoSuppressedTabs.clear();

    const injectableTabs = await this.autoBoosterClient.queryInjectableTabs();

    for (const tab of injectableTabs) {
      if (!tab.id || !isSupportedTabUrl(tab.url)) {
        continue;
      }

      await this.activateAutoBoosterForTab(tab, "global", globalGainPercent);
    }
  }

  private async disableGlobalAutoBooster(): Promise<void> {
    await this.deactivateGlobalAutoBooster();
    await this.broadcastState();
  }

  /**
   * Desactiva por completo el modo global y limpia sus tabs asociadas.
   */
  private async deactivateGlobalAutoBooster(): Promise<void> {
    this.autoBoosterMode = await this.settingsRepository.setAutoBoosterMode("off");
    this.autoSuppressedTabs.clear();
    await this.unregisterGlobalContentScripts();

    const globalTabIds = new Set<number>();

    for (const [tabId, autoState] of this.autoTabStates) {
      if (autoState.autoBoosterScope === "global") {
        globalTabIds.add(tabId);
      }
    }

    for (const [tabId, session] of this.autoSessions) {
      if (session.autoBoosterScope === "global") {
        globalTabIds.add(tabId);
      }
    }

    for (const tabId of globalTabIds) {
      const knownFrames = this.autoFrameRegistry.getKnownFrames(tabId);

      if (knownFrames.length === 0) {
        await this.autoBoosterClient.disable(tabId);
      } else {
        await Promise.allSettled(
          knownFrames.map((frame) =>
            this.autoBoosterClient.disable(tabId, {
              frameId: frame.frameId,
              documentId: frame.documentId
            })
          )
        );
      }
      this.autoSessions.delete(tabId);
      this.autoTabStates.delete(tabId);
      this.autoDebugStates.delete(tabId);
      this.autoFrameRegistry.clearTab(tabId);
    }

    this.rebuildEffectiveSessions();
  }

  private async syncGlobalAutoBoosterAcrossTabs(): Promise<void> {
    await this.registerGlobalContentScripts();
    const injectableTabs = await this.autoBoosterClient.queryInjectableTabs();

    for (const tab of injectableTabs) {
      if (!tab.id || !isSupportedTabUrl(tab.url) || this.autoSuppressedTabs.has(tab.id)) {
        continue;
      }

      await this.activateAutoBoosterForTab(tab, "global");
    }
  }

  private async syncConfiguredAutoTabs(settings?: AdvancedAudioSettings): Promise<void> {
    const nextSettings = settings ?? (await this.settingsRepository.getAdvancedAudioSettings());
    const tabsToSync = new Map<number, AutoBoosterScope>();

    for (const tabId of this.siteEnabledAutoTabs) {
      tabsToSync.set(tabId, "site");
    }

    if (this.autoBoosterMode === "global") {
      const injectableTabs = await this.autoBoosterClient.queryInjectableTabs();

      for (const tab of injectableTabs) {
        if (!tab.id || !isSupportedTabUrl(tab.url) || this.autoSuppressedTabs.has(tab.id)) {
          continue;
        }

        tabsToSync.set(tab.id, "global");
      }
    }

    for (const [tabId, scope] of tabsToSync) {
      const tab = await chrome.tabs.get(tabId).catch(() => null);

      if (!tab?.id || !isSupportedTabUrl(tab.url)) {
        continue;
      }

      await this.activateAutoBoosterForTab(tab, scope, undefined, nextSettings);
    }
  }

  /**
   * Activa o reconfigura el auto-booster sobre una pestaña compatible.
   */
  private async activateAutoBoosterForTab(
    tab: chrome.tabs.Tab,
    scope: AutoBoosterScope,
    gainOverride?: number,
    settingsOverride?: AdvancedAudioSettings
  ): Promise<void> {
    if (!tab.id) {
      throw message("errorTabNoLongerExists");
    }

    if (!isSupportedTabUrl(tab.url)) {
      if (scope === "site") {
        throw message("errorTabNotCapturable");
      }

      this.markAutoUnsupported(tab, scope);
      return;
    }

    const domain = getDomainFromUrl(tab.url);
    const gainPercent =
      gainOverride !== undefined
        ? clampGainPercent(gainOverride)
        : scope === "global"
          ? await this.settingsRepository.getGlobalAutoGainPercent()
          : clampGainPercent((await this.settingsRepository.getDomainGain(domain)) ?? DEFAULT_GAIN_PERCENT);
    const advancedAudioSettings = settingsOverride ?? (await this.settingsRepository.getAdvancedAudioSettings());
    const suspended = this.manualSessions.has(tab.id) || this.autoSuppressedTabs.has(tab.id);
    const state: AutoTabRuntimeState = {
      tabId: tab.id,
      title: tab.title || tab.url || "",
      url: tab.url,
      domain,
      favIconUrl: tab.favIconUrl,
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      autoBoosterScope: scope,
      autoActiveStrategy: "none",
      gainPercent
    };

    if (scope === "site") {
      this.siteEnabledAutoTabs.add(tab.id);
    }

    this.autoFrameRegistry.resetToastStateForTab(tab.id);
    this.autoTabStates.set(tab.id, state);
    this.autoDebugStates.set(tab.id, {
      frameCount: this.autoFrameRegistry.getFrameStates(tab.id).length,
      readyFrameCount: this.autoFrameRegistry.getFrameStates(tab.id).filter((frame) => frame.ready).length,
      attachedFrameCount: this.autoFrameRegistry
        .getFrameStates(tab.id)
        .filter((frame) => frame.autoAttachState === "attached").length,
      toastVisible: false
    });
    this.rebuildEffectiveSessions();

    const payload: AutoBoosterConfigPayload = {
      tabId: tab.id,
      scope,
      enabled: true,
      suspended,
      gainPercent,
      advancedAudioSettings
    };

    try {
      const targetTabId = tab.id;
      const knownFrames = this.autoFrameRegistry.getKnownFrames(targetTabId);

      if (knownFrames.length === 0) {
        if (typeof this.autoBoosterClient.injectRegisteredScriptsIntoTab === "function") {
          await this.autoBoosterClient.injectRegisteredScriptsIntoTab(targetTabId);
        }
        await this.autoBoosterClient.configure(targetTabId, payload);
      } else {
        await Promise.allSettled(
          knownFrames.map((frame) =>
            this.autoBoosterClient.configure(targetTabId, payload, {
              frameId: frame.frameId,
              documentId: frame.documentId
            })
          )
        );
      }
    } catch (error) {
      const localizedError = this.toErrorMessage(error);
      this.autoSessions.delete(tab.id);
      this.autoTabStates.set(tab.id, {
        ...state,
        autoAttachState: localizedError.key === "errorAutoPermissionMissing" ? "unsupported" : "failed",
        autoAttachReason:
          localizedError.key === "errorAutoPermissionMissing" ? "permission_missing" : "attach_failed",
        lastError: localizedError
      });
      this.rebuildEffectiveSessions();

      if (scope === "site") {
        throw localizedError;
      }
    }
  }

  private async pauseAutoLaneForManual(tabId: number): Promise<void> {
    const scope = this.getAutoScopeForTab(tabId);

    if (!scope) {
      return;
    }

    const tab = await chrome.tabs.get(tabId).catch(() => null);

    if (!tab?.id || !isSupportedTabUrl(tab.url)) {
      return;
    }

    const targetTabId = tab.id;

    const advancedAudioSettings = await this.settingsRepository.getAdvancedAudioSettings();
    const gainPercent =
      this.autoSessions.get(tabId)?.gainPercent ??
      this.manualSessions.get(tabId)?.gainPercent ??
      DEFAULT_GAIN_PERCENT;
    const payload = {
      tabId: targetTabId,
      scope,
      enabled: true,
      suspended: true,
      gainPercent,
      advancedAudioSettings
    } satisfies AutoBoosterConfigPayload;
    const knownFrames = this.autoFrameRegistry.getKnownFrames(targetTabId);

    if (knownFrames.length === 0) {
      await this.autoBoosterClient.configure(targetTabId, payload);
      return;
    }

    await Promise.allSettled(
      knownFrames.map((frame) =>
        this.autoBoosterClient.configure(targetTabId, payload, {
          frameId: frame.frameId,
          documentId: frame.documentId
        })
      )
    );
  }

  private async resumeAutoLaneIfNeeded(tabId: number): Promise<void> {
    const scope = this.getAutoScopeForTab(tabId);

    if (!scope || this.autoSuppressedTabs.has(tabId)) {
      return;
    }

    const tab = await chrome.tabs.get(tabId).catch(() => null);

    if (!tab?.id || !isSupportedTabUrl(tab.url)) {
      return;
    }

    await this.activateAutoBoosterForTab(tab, scope);
  }

  private async stopAutoForTab(tabId: number): Promise<void> {
    const scope = this.getAutoScopeForTab(tabId);

    if (scope === "site") {
      this.siteEnabledAutoTabs.delete(tabId);
    } else if (scope === "global") {
      this.autoSuppressedTabs.add(tabId);
    }

    const knownFrames = this.autoFrameRegistry.getKnownFrames(tabId);

    if (knownFrames.length === 0) {
      await this.autoBoosterClient.disable(tabId);
    } else {
      await Promise.allSettled(
        knownFrames.map((frame) =>
          this.autoBoosterClient.disable(tabId, { frameId: frame.frameId, documentId: frame.documentId })
        )
      );
    }
    this.autoSessions.delete(tabId);
    this.autoTabStates.delete(tabId);
    this.autoDebugStates.delete(tabId);
    this.autoFrameRegistry.clearTab(tabId);
    this.audibleTabs.delete(tabId);
    this.rebuildEffectiveSessions();
  }

  private async disableAllSiteAutoTabs(): Promise<void> {
    const siteTabIds = new Set<number>([...this.siteEnabledAutoTabs]);

    for (const [tabId, autoState] of this.autoTabStates) {
      if (autoState.autoBoosterScope === "site") {
        siteTabIds.add(tabId);
      }
    }

    for (const [tabId, session] of this.autoSessions) {
      if (session.autoBoosterScope === "site") {
        siteTabIds.add(tabId);
      }
    }

    this.siteEnabledAutoTabs.clear();

    for (const tabId of siteTabIds) {
      const knownFrames = this.autoFrameRegistry.getKnownFrames(tabId);

      if (knownFrames.length === 0) {
        await this.autoBoosterClient.disable(tabId);
      } else {
        await Promise.allSettled(
          knownFrames.map((frame) =>
            this.autoBoosterClient.disable(tabId, {
              frameId: frame.frameId,
              documentId: frame.documentId
            })
          )
        );
      }
      this.autoSessions.delete(tabId);
      this.autoTabStates.delete(tabId);
      this.autoDebugStates.delete(tabId);
      this.autoFrameRegistry.clearTab(tabId);
      this.audibleTabs.delete(tabId);
    }

    this.rebuildEffectiveSessions();
  }

  private async syncGlobalAutoBoosterGain(gainPercent: number): Promise<void> {
    if (this.autoBoosterMode !== "global") {
      return;
    }

    const injectableTabs = await this.autoBoosterClient.queryInjectableTabs();

    for (const tab of injectableTabs) {
      if (!tab.id || !isSupportedTabUrl(tab.url) || this.autoSuppressedTabs.has(tab.id)) {
        continue;
      }

      await this.activateAutoBoosterForTab(tab, "global", gainPercent);
    }
  }

  private async validateTabForAutoBooster(tabId: number): Promise<chrome.tabs.Tab> {
    const targetTab = await chrome.tabs.get(tabId);

    if (!targetTab.id) {
      throw message("errorTabNoLongerExists");
    }

    if (!isSupportedTabUrl(targetTab.url)) {
      throw message("errorTabNotCapturable");
    }

    return targetTab;
  }

  private markAutoUnsupported(tab: chrome.tabs.Tab, scope: AutoBoosterScope): void {
    if (!tab.id) {
      return;
    }

    this.autoFrameRegistry.clearTab(tab.id);
    this.autoSessions.delete(tab.id);
    this.autoTabStates.set(tab.id, {
      tabId: tab.id,
      title: tab.title || tab.url || "",
      url: tab.url,
      domain: getDomainFromUrl(tab.url),
      favIconUrl: tab.favIconUrl,
      autoAttachState: "unsupported",
      autoAttachReason: "site_not_hookable",
      autoBoosterScope: scope,
      autoActiveStrategy: "none",
      gainPercent: DEFAULT_GAIN_PERCENT,
      lastError: message("errorAutoUnsupportedSite")
    });
    this.autoDebugStates.set(tab.id, {
      frameCount: 0,
      readyFrameCount: 0,
      attachedFrameCount: 0,
      toastVisible: false
    });
    this.rebuildEffectiveSessions();
  }

  private resetNavigationScopedAutoState(tabId: number): void {
    if (this.siteEnabledAutoTabs.has(tabId)) {
      this.siteEnabledAutoTabs.delete(tabId);
    }

    this.autoSuppressedTabs.delete(tabId);
    this.autoSessions.delete(tabId);
    this.autoTabStates.delete(tabId);
    this.autoDebugStates.delete(tabId);
    this.autoFrameRegistry.clearTab(tabId);
    this.audibleTabs.delete(tabId);
    this.rebuildEffectiveSessions();
  }

  private async registerGlobalContentScripts(): Promise<void> {
    if (typeof this.autoBoosterClient.registerGlobalContentScripts === "function") {
      await this.autoBoosterClient.registerGlobalContentScripts();
    }
  }

  private async unregisterGlobalContentScripts(): Promise<void> {
    if (typeof this.autoBoosterClient.unregisterGlobalContentScripts === "function") {
      await this.autoBoosterClient.unregisterGlobalContentScripts();
    }
  }

  private getAutoScopeForTab(tabId: number): AutoBoosterScope | undefined {
    if (this.siteEnabledAutoTabs.has(tabId)) {
      return "site";
    }

    if (this.autoTabStates.get(tabId)?.autoBoosterScope === "global" || this.autoBoosterMode === "global") {
      return "global";
    }

    return undefined;
  }

  private shouldAutoRemainEnabled(tabId: number): boolean {
    return this.siteEnabledAutoTabs.has(tabId) || (this.autoBoosterMode === "global" && !this.autoSuppressedTabs.has(tabId));
  }

  private toErrorMessage(error: unknown): LocalizedMessage {
    if (isLocalizedMessage(error)) {
      return error;
    }

    return message("errorExtensionActionFailed");
  }

  /**
   * Sincroniza el badge de la action con el estado audible real de cada tab
   * boosteada.
   */
  private async syncActionBadges(): Promise<void> {
    if (!chrome.action) {
      return;
    }

    this.pruneAudibleTabs();
    this.syncBadgePulseTimer();

    const nextBadgedTabs = new Set<number>();

    for (const session of this.sessions.values()) {
      if (session.streamState === "active" && this.isTabAudible(session.tabId)) {
        nextBadgedTabs.add(session.tabId);
      }
    }

    const relevantTabIds = new Set<number>([...this.badgedTabs, ...this.sessions.keys()]);
    const updates: Promise<unknown>[] = [];

    for (const tabId of relevantTabIds) {
      const shouldBadge = nextBadgedTabs.has(tabId);
      updates.push(chrome.action.setBadgeText({ tabId, text: shouldBadge ? ACTION_BADGE_TEXT : "" }));

      if (shouldBadge) {
        if (chrome.action.setBadgeTextColor) {
          updates.push(
            chrome.action.setBadgeTextColor({
              tabId,
              color: ACTION_BADGE_TEXT_COLOR
            })
          );
        }

        updates.push(
          chrome.action.setBadgeBackgroundColor({
            tabId,
            color:
              this.isTabAudible(tabId) && this.badgePulseHighlighted
                ? ACTION_BADGE_PULSE_COLOR
                : ACTION_BADGE_IDLE_COLOR
          })
        );
      }
    }

    await Promise.allSettled(updates);

    this.badgedTabs.clear();

    for (const tabId of nextBadgedTabs) {
      this.badgedTabs.add(tabId);
    }
  }

  private updateAudibleState(tabId: number, level: number): boolean {
    const wasAudible = this.isTabAudible(tabId);
    const currentSession = this.sessions.get(tabId);

    if (!currentSession || currentSession.streamState !== "active") {
      this.audibleTabs.delete(tabId);
      this.syncBadgePulseTimer();
      return wasAudible;
    }

    if (level >= ACTION_BADGE_AUDIBLE_THRESHOLD) {
      this.audibleTabs.set(tabId, this.now() + ACTION_BADGE_AUDIBLE_HOLD_MS);
    } else {
      const audibleUntil = this.audibleTabs.get(tabId) ?? 0;

      if (audibleUntil <= this.now()) {
        this.audibleTabs.delete(tabId);
      }
    }

    this.syncBadgePulseTimer();
    return wasAudible !== this.isTabAudible(tabId);
  }

  private isTabAudible(tabId: number): boolean {
    const currentSession = this.sessions.get(tabId);

    if (!currentSession || currentSession.streamState !== "active") {
      return false;
    }

    return (this.audibleTabs.get(tabId) ?? 0) > this.now();
  }

  private pruneAudibleTabs(): void {
    for (const [tabId, audibleUntil] of this.audibleTabs) {
      const currentSession = this.sessions.get(tabId);

      if (!currentSession || currentSession.streamState !== "active" || audibleUntil <= this.now()) {
        this.audibleTabs.delete(tabId);
      }
    }
  }

  private syncBadgePulseTimer(): void {
    if (this.audibleTabs.size > 0) {
      if (this.badgePulseTimer !== null) {
        return;
      }

      this.badgePulseHighlighted = false;
      this.badgePulseTimer = globalThis.setInterval(() => {
        this.pruneAudibleTabs();

        if (this.audibleTabs.size === 0) {
          this.stopBadgePulseTimer();
          void this.syncActionBadges();
          return;
        }

        this.badgePulseHighlighted = !this.badgePulseHighlighted;
        void this.syncActionBadges();
      }, ACTION_BADGE_PULSE_MS);
      return;
    }

    this.stopBadgePulseTimer();
  }

  private stopBadgePulseTimer(): void {
    if (this.badgePulseTimer !== null) {
      globalThis.clearInterval(this.badgePulseTimer);
      this.badgePulseTimer = null;
    }

    this.badgePulseHighlighted = false;
  }
}
