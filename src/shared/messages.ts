import type {
  AdvancedAudioSettings,
  AutoBoosterDebugState,
  AutoBoosterConfigPayload,
  AutoSessionAttachFailedPayload,
  AutoSessionLevelPayload,
  AutoSessionStatusPayload,
  AutoSessionToastRequestedPayload,
  LevelUpdatePayload,
  LocalizedMessage,
  OffscreenMetadataPayload,
  OffscreenSessionStartPayload,
  RuntimeResponse,
  SessionStatusPayload,
  WorkerState
} from "./types";
import type { I18nKey, I18nSubstitutionsFor } from "../generated/i18n-types";

export type PopupCommand =
  | { type: "GET_STATE" }
  | { type: "GET_DEBUG_STATE"; payload: { tabId: number } }
  | { type: "START_CAPTURE"; payload: { tabId: number; gainPercent: number } }
  | { type: "ENABLE_CURRENT_TAB_BOOSTER"; payload: { tabId: number; gainPercent: number } }
  | { type: "DISABLE_CURRENT_TAB_BOOSTER"; payload: { tabId: number } }
  | { type: "ENABLE_GLOBAL_AUTO_BOOSTER"; payload: { tabId: number; gainPercent: number } }
  | { type: "DISABLE_GLOBAL_AUTO_BOOSTER" }
  | { type: "REQUEST_SITE_PERMISSION"; payload: { tabId: number } }
  | { type: "REQUEST_GLOBAL_PERMISSION" }
  | { type: "SET_GAIN"; payload: { tabId: number; gainPercent: number } }
  | { type: "SAVE_DOMAIN_GAIN"; payload: { tabId: number; gainPercent: number } }
  | { type: "REMOVE_DOMAIN_GAIN"; payload: { tabId: number } }
  | { type: "GET_ADVANCED_AUDIO_SETTINGS" }
  | { type: "SET_ADVANCED_AUDIO_SETTINGS"; payload: Partial<AdvancedAudioSettings> }
  | { type: "STOP_CAPTURE"; payload: { tabId: number } }
  | { type: "STOP_ALL" };

export type OffscreenCommand =
  | { type: "OFFSCREEN_START_SESSION"; payload: OffscreenSessionStartPayload }
  | { type: "OFFSCREEN_SET_GAIN"; payload: { tabId: number; gainPercent: number } }
  | { type: "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS"; payload: AdvancedAudioSettings }
  | { type: "OFFSCREEN_STOP_SESSION"; payload: { tabId: number } }
  | { type: "OFFSCREEN_STOP_ALL" }
  | { type: "OFFSCREEN_GET_SNAPSHOT" }
  | { type: "OFFSCREEN_UPDATE_METADATA"; payload: OffscreenMetadataPayload };

export type ContentCommand =
  | { type: "AUTO_BOOSTER_PING" }
  | { type: "AUTO_BOOSTER_CONFIGURE"; payload: AutoBoosterConfigPayload }
  | { type: "AUTO_BOOSTER_DISABLE"; payload: { tabId: number } }
  | { type: "AUTO_BOOSTER_GET_DEBUG_STATE" };

export type WorkerEvent =
  | { type: "WORKER_STATE_UPDATE"; payload: WorkerState }
  | { type: "WORKER_ERROR"; payload: { message: LocalizedMessage; tabId?: number } };

export type OffscreenEvent =
  | { type: "SESSION_LEVEL_UPDATE"; payload: LevelUpdatePayload }
  | { type: "SESSION_STATUS_UPDATE"; payload: SessionStatusPayload }
  | { type: "OFFSCREEN_SNAPSHOT"; payload: { sessions: WorkerState["sessions"] } };

export type ContentEvent =
  | { type: "AUTO_SESSION_STATUS_UPDATE"; payload: AutoSessionStatusPayload }
  | { type: "AUTO_SESSION_LEVEL_UPDATE"; payload: AutoSessionLevelPayload }
  | { type: "AUTO_SESSION_ATTACH_FAILED"; payload: AutoSessionAttachFailedPayload }
  | { type: "AUTO_SESSION_TOAST_REQUESTED"; payload: AutoSessionToastRequestedPayload };

export type ExtensionMessage =
  | PopupCommand
  | OffscreenCommand
  | ContentCommand
  | WorkerEvent
  | OffscreenEvent
  | ContentEvent;

export function isPopupCommand(message: unknown): message is PopupCommand {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  return [
    "GET_STATE",
    "GET_DEBUG_STATE",
    "START_CAPTURE",
    "ENABLE_CURRENT_TAB_BOOSTER",
    "DISABLE_CURRENT_TAB_BOOSTER",
    "ENABLE_GLOBAL_AUTO_BOOSTER",
    "DISABLE_GLOBAL_AUTO_BOOSTER",
    "REQUEST_SITE_PERMISSION",
    "REQUEST_GLOBAL_PERMISSION",
    "SET_GAIN",
    "SAVE_DOMAIN_GAIN",
    "REMOVE_DOMAIN_GAIN",
    "GET_ADVANCED_AUDIO_SETTINGS",
    "SET_ADVANCED_AUDIO_SETTINGS",
    "STOP_CAPTURE",
    "STOP_ALL"
  ].includes((message as { type: string }).type);
}

export function isOffscreenCommand(message: unknown): message is OffscreenCommand {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  return [
    "OFFSCREEN_START_SESSION",
    "OFFSCREEN_SET_GAIN",
    "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS",
    "OFFSCREEN_STOP_SESSION",
    "OFFSCREEN_STOP_ALL",
    "OFFSCREEN_GET_SNAPSHOT",
    "OFFSCREEN_UPDATE_METADATA"
  ].includes((message as { type: string }).type);
}

export function isContentCommand(message: unknown): message is ContentCommand {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  return ["AUTO_BOOSTER_PING", "AUTO_BOOSTER_CONFIGURE", "AUTO_BOOSTER_DISABLE", "AUTO_BOOSTER_GET_DEBUG_STATE"].includes(
    (message as { type: string }).type
  );
}

export function isOffscreenEvent(message: unknown): message is OffscreenEvent {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  return ["SESSION_LEVEL_UPDATE", "SESSION_STATUS_UPDATE", "OFFSCREEN_SNAPSHOT"].includes(
    (message as { type: string }).type
  );
}

export function isContentEvent(message: unknown): message is ContentEvent {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  return [
    "AUTO_SESSION_STATUS_UPDATE",
    "AUTO_SESSION_LEVEL_UPDATE",
    "AUTO_SESSION_ATTACH_FAILED",
    "AUTO_SESSION_TOAST_REQUESTED"
  ].includes((message as { type: string }).type);
}

export function ok<T>(data?: T): RuntimeResponse<T> {
  return { ok: true, data };
}

export function fail<T>(errorMessage: LocalizedMessage): RuntimeResponse<T> {
  return { ok: false, errorMessage };
}

export function message<K extends I18nKey>(
  key: K,
  substitutions?: I18nSubstitutionsFor<K>
): LocalizedMessage<K> {
  return substitutions ? { key, substitutions } : { key };
}

export function isLocalizedMessage(value: unknown): value is LocalizedMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "key" in value &&
      typeof (value as { key: unknown }).key === "string"
  );
}

export async function sendMessage<T>(messageValue: ExtensionMessage): Promise<RuntimeResponse<T>> {
  return (await Promise.resolve(
    chrome.runtime.sendMessage(messageValue) as RuntimeResponse<T> | Promise<RuntimeResponse<T>>
  )) as RuntimeResponse<T>;
}

export async function sendMessageSafe<T>(messageValue: ExtensionMessage): Promise<RuntimeResponse<T>> {
  try {
    const response = await sendMessage<T>(messageValue);
    return normalizeRuntimeResponse(response);
  } catch {
    return fail(message("errorRuntimeMessageUndeliverable"));
  }
}

export type DebugStateResponse = RuntimeResponse<AutoBoosterDebugState | null>;

function normalizeRuntimeResponse<T>(response: RuntimeResponse<T> | undefined | null): RuntimeResponse<T> {
  if (response && typeof response === "object" && typeof response.ok === "boolean") {
    return response;
  }

  return fail(message("errorRuntimeNoResponse"));
}
