/**
 * @fileoverview Builds or watches the registered global auto-booster content
 * script bundles used by `chrome.scripting.registerContentScripts`.
 */
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const viteBin = resolve(repoRoot, "node_modules", "vite", "bin", "vite.js");
const configPath = resolve(repoRoot, "vite.registered-content-scripts.config.ts");
const watchMode = process.argv.includes("--watch");
const targets = ["isolated", "main"];

if (watchMode) {
  const children = targets.map((target) => runBuild(target, true));

  for (const child of children) {
    child.on("exit", (code) => {
      for (const sibling of children) {
        if (sibling !== child) {
          sibling.kill();
        }
      }

      process.exit(code ?? 0);
    });
  }
} else {
  for (const target of targets) {
    const exitCode = await waitForExit(runBuild(target, false));

    if (exitCode !== 0) {
      process.exit(exitCode ?? 1);
    }
  }
}

function runBuild(target, watch) {
  return spawn(
    process.execPath,
    [viteBin, "build", "--config", configPath, ...(watch ? ["--watch"] : [])],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        PRISM_REGISTERED_CONTENT_SCRIPT_TARGET: target
      }
    }
  );
}

function waitForExit(child) {
  return new Promise((resolvePromise, rejectPromise) => {
    child.once("exit", (code) => resolvePromise(code));
    child.once("error", rejectPromise);
  });
}
