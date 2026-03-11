import type { ListenerHandler } from "../state/scope-stub-types";
import { listenerMap } from "../state/runtime-mocks";

export function storeListenerMapEntry(type: string, handler: ListenerHandler): void {
  listenerMap.set(type, handler);
}
