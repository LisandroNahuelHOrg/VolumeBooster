import { unregisterRegisteredScripts } from "./unregister-registered-scripts";

export async function unregisterGlobalContentScripts(): Promise<void> {
  await unregisterRegisteredScripts();
}
