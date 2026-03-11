import { resolveDelay } from "./resolve-delay";

export function delay(milliseconds: number): Promise<void> {
  return new Promise(resolveDelay.bind(undefined, milliseconds));
}
