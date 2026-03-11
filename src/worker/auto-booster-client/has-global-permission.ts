export async function hasGlobalPermission(): Promise<boolean> {
  if (!chrome.permissions?.contains) {
    return false;
  }

  return chrome.permissions.contains({
    origins: ["<all_urls>"]
  });
}
