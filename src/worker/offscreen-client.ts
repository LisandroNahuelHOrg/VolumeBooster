/**
 * @fileoverview Client wrapper around runtime messages sent to the offscreen
 * document that owns manual tab-capture sessions.
 * @module worker/offscreen-client
 */

import { OFFSCREEN_DOCUMENT_PATH, OFFSCREEN_JUSTIFICATION } from "../shared/constants";
import { message, sendMessage, type OffscreenCommand } from "../shared/messages";
import type {
  AdvancedAudioSettings,
  CaptureSessionState,
  OffscreenMetadataPayload,
  OffscreenSessionStartPayload
} from "../shared/types";

type SnapshotResponse = { sessions: CaptureSessionState[] };

/**
 * Coordinates lifecycle and RPC calls for the hidden offscreen document.
 */
export class OffscreenClient {
  /** Ensures the offscreen document exists before issuing commands that require it. */
  async ensureDocument(): Promise<void> {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    if (existingContexts.length > 0) {
      return;
    }

    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: OFFSCREEN_JUSTIFICATION
    });
  }

  /**
   * Checks whether the offscreen document is currently alive.
   *
   * @returns `true` when Chrome reports an existing offscreen document.
   */
  async hasDocument(): Promise<boolean> {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    return existingContexts.length > 0;
  }

  /**
   * Retrieves the current offscreen session snapshot.
   *
   * @returns Session list reported by the offscreen document, or an empty array
   * when the document does not exist.
   */
  async getSnapshot(): Promise<CaptureSessionState[]> {
    if (!(await this.hasDocument())) {
      return [];
    }

    const response = await this.sendOffscreenMessage<SnapshotResponse>({ type: "OFFSCREEN_GET_SNAPSHOT" });
    return response.ok && response.data ? response.data.sessions : [];
  }

  /**
   * Starts or replaces a manual capture session in the offscreen document.
   *
   * @param payload - Session bootstrap data including stream id and DSP config.
   * @returns Updated list of manual capture sessions.
   * @throws LocalizedMessage when the offscreen side rejects the operation.
   */
  async startSession(payload: OffscreenSessionStartPayload): Promise<CaptureSessionState[]> {
    await this.ensureDocument();
    const response = await this.sendOffscreenMessage<SnapshotResponse>({
      type: "OFFSCREEN_START_SESSION",
      payload
    });

    if (!response.ok || !response.data) {
      throw response.errorMessage ?? message("errorOffscreenStartSession");
    }

    return response.data.sessions;
  }

  /**
   * Updates the gain of an existing manual capture session.
   *
   * @param tabId - Tab whose session should be updated.
   * @param gainPercent - New gain percentage.
   * @returns Updated session snapshot.
   */
  async setGain(tabId: number, gainPercent: number): Promise<CaptureSessionState[]> {
    const response = await this.sendOffscreenMessage<SnapshotResponse>({
      type: "OFFSCREEN_SET_GAIN",
      payload: { tabId, gainPercent }
    });

    if (!response.ok || !response.data) {
      throw response.errorMessage ?? message("errorOffscreenSetGain");
    }

    return response.data.sessions;
  }

  /**
   * Broadcasts new advanced audio settings to every active manual session.
   *
   * @param settings - Global advanced DSP settings.
   * @returns Updated session snapshot, or an empty array when the document is absent.
   */
  async setAdvancedAudioSettings(settings: AdvancedAudioSettings): Promise<CaptureSessionState[]> {
    if (!(await this.hasDocument())) {
      return [];
    }

    const response = await this.sendOffscreenMessage<SnapshotResponse>({
      type: "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS",
      payload: settings
    });

    if (!response.ok || !response.data) {
      throw response.errorMessage ?? message("errorOffscreenSetAudioSettings");
    }

    return response.data.sessions;
  }

  /**
   * Updates presentation metadata for a manual capture session.
   *
   * @param payload - Metadata fields to refresh.
   * @returns Updated session snapshot.
   */
  async updateMetadata(payload: OffscreenMetadataPayload): Promise<CaptureSessionState[]> {
    const response = await this.sendOffscreenMessage<SnapshotResponse>({
      type: "OFFSCREEN_UPDATE_METADATA",
      payload
    });

    if (!response.ok || !response.data) {
      throw response.errorMessage ?? message("errorOffscreenUpdateMetadata");
    }

    return response.data.sessions;
  }

  /**
   * Stops the manual capture session associated with a specific tab.
   *
   * @param tabId - Tab whose session should be stopped.
   * @returns Updated session snapshot.
   */
  async stopSession(tabId: number): Promise<CaptureSessionState[]> {
    if (!(await this.hasDocument())) {
      return [];
    }

    const response = await this.sendOffscreenMessage<SnapshotResponse>({
      type: "OFFSCREEN_STOP_SESSION",
      payload: { tabId }
    });

    if (!response.ok || !response.data) {
      throw response.errorMessage ?? message("errorOffscreenStopSession");
    }

    return response.data.sessions;
  }

  /**
   * Stops every active manual capture session.
   *
   * @returns Updated session snapshot after all sessions are stopped.
   */
  async stopAll(): Promise<CaptureSessionState[]> {
    if (!(await this.hasDocument())) {
      return [];
    }

    const response = await this.sendOffscreenMessage<SnapshotResponse>({ type: "OFFSCREEN_STOP_ALL" });

    if (!response.ok || !response.data) {
      throw response.errorMessage ?? message("errorOffscreenStopAll");
    }

    return response.data.sessions;
  }

  /**
   * Closes the offscreen document once it no longer owns any active sessions.
   *
   * @param sessionCount - Number of active manual sessions still known by the worker.
   */
  async closeIfIdle(sessionCount: number): Promise<void> {
    if (sessionCount > 0 || !(await this.hasDocument())) {
      return;
    }

    await chrome.offscreen.closeDocument();
  }

  /**
   * Sends a command to the offscreen document and retries once if the receiver
   * disappeared while the worker was alive.
   *
   * @param command - Offscreen command to send.
   * @param attempts - Maximum number of delivery attempts.
   * @returns Runtime response produced by the offscreen document.
   */
  private async sendOffscreenMessage<T>(
    command: OffscreenCommand,
    attempts = 2
  ): Promise<{ ok: boolean; data?: T; errorMessage?: import("../shared/types").LocalizedMessage }> {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await sendMessage<T>(command);
      } catch (error) {
        lastError = error;

        if (!isMissingReceiverError(error) || attempt === attempts - 1) {
          throw error;
        }

        await this.ensureDocument();
        await delay(50);
      }
    }

    throw lastError ?? message("errorOffscreenMessageUndeliverable");
  }
}

/**
 * Detects the common Chrome runtime error raised when the offscreen document is
 * not currently listening.
 *
 * @param error - Unknown thrown value.
 * @returns `true` when the error indicates a missing runtime receiver.
 */
function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && /Receiving end does not exist/i.test(error.message);
}

/**
 * Sleeps for a short amount of time before retrying offscreen delivery.
 *
 * @param milliseconds - Delay duration.
 * @returns Promise that resolves after the requested delay.
 */
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
