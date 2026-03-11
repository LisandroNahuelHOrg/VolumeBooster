import { createAutoBoosterClient } from "../../auto-booster-client";

export function createAutoBoosterClientTestHarness() {
  const executeScript = vi.fn();
  const registerContentScripts = vi.fn();
  const sendMessage = vi.fn();
  const requestPermission = vi.fn();
  const containsPermission = vi.fn();
  const queryTabs = vi.fn();
  const unregisterContentScripts = vi.fn();

  vi.stubGlobal(
    "chrome",
    {
      scripting: {
        executeScript,
        registerContentScripts,
        unregisterContentScripts
      },
      tabs: {
        sendMessage,
        query: queryTabs
      },
      permissions: {
        request: requestPermission,
        contains: containsPermission
      }
    } as unknown as typeof chrome
  );

  return {
    client: createAutoBoosterClient(),
    executeScript,
    registerContentScripts,
    sendMessage,
    requestPermission,
    containsPermission,
    queryTabs,
    unregisterContentScripts
  };
}
