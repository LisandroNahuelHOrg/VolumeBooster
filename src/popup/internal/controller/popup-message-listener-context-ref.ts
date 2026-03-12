import type { PopupMessageListenerContext } from "./popup-message-listener-context";

export const popupMessageListenerContextRef: {
  current: PopupMessageListenerContext | null;
} = {
  current: null
};
