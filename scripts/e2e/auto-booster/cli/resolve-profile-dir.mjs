import { resolve } from "node:path";

export function resolveProfileDir(cwd, env, outputRoot) {
  if (env.PRISM_E2E_PROFILE_DIR) {
    return resolve(cwd, env.PRISM_E2E_PROFILE_DIR);
  }

  return resolve(outputRoot, "profile");
}
