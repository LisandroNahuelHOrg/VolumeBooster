import { OFFSCREEN_DOCUMENT_PATH, OFFSCREEN_JUSTIFICATION } from "../shared/constants";
import { message, sendMessage, type OffscreenCommand } from "../shared/messages";
import type {
  AdvancedAudioSettings,
  CaptureSessionState,
  OffscreenMetadataPayload,
  OffscreenSessionStartPayload
} from "../shared/types";

type SnapshotResponse = { sessions: CaptureSessionState[] };

export class OffscreenClient {
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

  async hasDocument(): Promise<boolean> {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    return existingContexts.length > 0;
  }

  async getSnapshot(): Promise<CaptureSessionState[]> {
    if (!(await this.hasDocument())) {
      return [];
    }

    const response = await this.sendOffscreenMessage<SnapshotResponse>({ type: "OFFSCREEN_GET_SNAPSHOT" });
    return response.ok && response.data ? response.data.sessions : [];
  }

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

  async closeIfIdle(sessionCount: number): Promise<void> {
    if (sessionCount > 0 || !(await this.hasDocument())) {
      return;
    }

    await chrome.offscreen.closeDocument();
  }

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

function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && /Receiving end does not exist/i.test(error.message);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
