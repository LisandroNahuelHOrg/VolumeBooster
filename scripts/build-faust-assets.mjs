import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  await withFsRetries(() => rm(target.output, { recursive: true, force: true }));
  await withFsRetries(() => rm(target.runtimeOutput, { recursive: true, force: true }));
  await mkdir(target.output, { recursive: true });
  await mkdir(target.runtimeOutput, { recursive: true });
  await run(process.execPath, [compilerScript, target.input, target.output, "-no-template"]);
  await generateMetadataWrapper(target.output);
  await withFsRetries(() =>
    copyFile(resolve(target.output, "dsp-meta.json"), resolve(target.runtimeOutput, "dsp-meta.json"))
  );
  await withFsRetries(() =>
    copyFile(resolve(target.output, "dsp-module.wasm"), resolve(target.runtimeOutput, "dsp-module.wasm"))
  );
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

async function generateMetadataWrapper(outputDirectory) {
  const metadataPath = resolve(outputDirectory, "dsp-meta.json");
  const wrapperPath = resolve(outputDirectory, "dsp-meta.ts");
  const rawMetadata = await readFile(metadataPath, "utf8");
  const parsedMetadata = JSON.parse(rawMetadata);
  const wrapperSource = [
    "/**",
    " * @fileoverview Metadata Faust generado para el DSP precompilado.",
    " */",
    `const metadata = ${JSON.stringify(parsedMetadata, null, 2)} as const;`,
    "",
    "export default metadata;"
  ].join("\n");

  await withFsRetries(() => writeFile(wrapperPath, wrapperSource, "utf8"));
}

async function withFsRetries(operation, attempts = 5, delayMs = 150) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetriableFsError(error) || attempt === attempts - 1) {
        throw error;
      }

      await delay(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}

function isRetriableFsError(error) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "EBUSY" || error.code === "EPERM")
  );
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}
