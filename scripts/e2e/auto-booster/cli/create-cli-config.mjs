import { parseScenarioFilter } from "./parse-scenario-filter.mjs";
import { parseSiteFilter } from "./parse-site-filter.mjs";
import { parseTargets } from "./parse-targets.mjs";
import { resolveDistDir } from "./resolve-dist-dir.mjs";
import { resolveOutputRoot } from "./resolve-output-root.mjs";
import { resolveProfileDir } from "./resolve-profile-dir.mjs";

export function createCliConfig(argv, env, cwd) {
  const outputRoot = resolveOutputRoot(cwd);

  return {
    cwd,
    distDir: resolveDistDir(cwd),
    outputRoot,
    profileDir: resolveProfileDir(cwd, env, outputRoot),
    scenarioFilter: parseScenarioFilter(argv),
    siteFilter: parseSiteFilter(argv),
    targets: parseTargets(argv)
  };
}
