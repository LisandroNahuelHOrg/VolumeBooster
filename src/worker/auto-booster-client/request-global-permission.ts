import { hasGlobalPermission } from "./has-global-permission";

export async function requestGlobalPermission(): Promise<boolean> {
  if (await hasGlobalPermission()) {
    return true;
  }

  if (!chrome.permissions?.request) {
    return false;
  }

  try {
    const granted = Boolean(
      await chrome.permissions.request({
        origins: ["<all_urls>"]
      })
    );

    if (!granted) {
      return false;
    }

    return hasGlobalPermission();
  } catch {
    return false;
  }
}
