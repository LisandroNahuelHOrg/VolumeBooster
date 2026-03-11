export async function requestGlobalPermission(): Promise<boolean> {
  if (!chrome.permissions?.request) {
    return false;
  }

  try {
    return Boolean(
      await chrome.permissions.request({
        origins: ["<all_urls>"]
      })
    );
  } catch {
    return false;
  }
}
