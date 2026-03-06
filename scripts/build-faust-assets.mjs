import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const compilerScript = resolve(repoRoot, "node_modules/@grame/faustwasm/scripts/faust2wasm.js");
const targets = [
  {
    input: resolve(repoRoot, "faust/prism-premium-mono.dsp"),
    output: resolve(repoRoot, "src/generated/faust/mono"),
    runtimeOutput: resolve(repoRoot, "public/faust/mono")
  },
  {
    input: resolve(repoRoot, "faust/prism-premium-stereo.dsp"),
    output: resolve(repoRoot, "src/generated/faust/stereo"),
    runtimeOutput: resolve(repoRoot, "public/faust/stereo")
  }
];

for (const target of targets) {
  await rm(target.output, { recursive: true, force: true });
  await rm(target.runtimeOutput, { recursive: true, force: true });
  await mkdir(target.output, { recursive: true });
  await mkdir(target.runtimeOutput, { recursive: true });
  await run(process.execPath, [compilerScript, target.input, target.output, "-no-template"]);
  await copyFile(resolve(target.output, "dsp-meta.json"), resolve(target.runtimeOutput, "dsp-meta.json"));
  await copyFile(resolve(target.output, "dsp-module.wasm"), resolve(target.runtimeOutput, "dsp-module.wasm"));
}

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`Command failed with exit code ${code}`));
    });
    child.on("error", rejectPromise);
  });
}
