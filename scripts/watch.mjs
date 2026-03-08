/**
 * @fileoverview Watcher combinado para recompilar assets Faust y mantener Vite
 * en modo watch durante el desarrollo local.
 */
import { watch } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const buildFaustScript = resolve(repoRoot, "scripts/build-faust-assets.mjs");
const faustDir = resolve(repoRoot, "faust");

await runFaustBuild();

const viteWatch = spawn("npm", ["run", "watch:vite"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true
});
const registeredContentScriptsWatch = spawn("npm", ["run", "watch:registered-content-scripts"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true
});

let rebuildTimer = null;

watch(faustDir, { recursive: true }, () => {
  if (rebuildTimer !== null) {
    clearTimeout(rebuildTimer);
  }

  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    void runFaustBuild().catch((error) => {
      console.error(error);
    });
  }, 150);
});

viteWatch.on("exit", (code) => {
  registeredContentScriptsWatch.kill();
  process.exit(code ?? 0);
});

registeredContentScriptsWatch.on("exit", (code) => {
  viteWatch.kill();
  process.exit(code ?? 0);
});

async function runFaustBuild() {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [buildFaustScript], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`Faust build failed with exit code ${code}`));
    });
    child.on("error", rejectPromise);
  });
}
