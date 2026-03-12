import { resolve } from "node:path";

export function resolveDistDir(cwd) {
  return resolve(cwd, "dist");
}
