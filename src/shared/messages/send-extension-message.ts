import type { RuntimeResponse } from "../types";
import type { ExtensionMessage } from "./extension-message";

export async function sendExtensionMessage<T>(messageValue: ExtensionMessage): Promise<RuntimeResponse<T>> {
  return (await Promise.resolve(
    chrome.runtime.sendMessage(messageValue) as RuntimeResponse<T> | Promise<RuntimeResponse<T>>
  )) as RuntimeResponse<T>;
}
