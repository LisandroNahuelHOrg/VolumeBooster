import { createOffscreenClient } from "../../offscreen-client";
import { buildTestExtensionUrl } from "./build-test-extension-url";

export function createOffscreenClientTestHarness() {
  const createDocument = vi.fn();
  const closeDocument = vi.fn();
  const getContexts = vi.fn();
  const sendMessage = vi.fn();
  const getUrl = vi.fn(buildTestExtensionUrl);

  vi.stubGlobal(
    "chrome",
    {
      runtime: {
        getContexts,
        getURL: getUrl,
        sendMessage
      },
      offscreen: {
        createDocument,
        closeDocument,
        Reason: {
          USER_MEDIA: "USER_MEDIA"
        }
      }
    } as unknown as typeof chrome
  );

  return {
    client: createOffscreenClient(),
    createDocument,
    closeDocument,
    getContexts,
    sendMessage,
    getUrl
  };
}
