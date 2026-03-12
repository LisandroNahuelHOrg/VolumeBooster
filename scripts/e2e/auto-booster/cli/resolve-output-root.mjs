import { resolve } from "node:path";

export function resolveOutputRoot(cwd) {
  return resolve(cwd, "output/playwright");
}
