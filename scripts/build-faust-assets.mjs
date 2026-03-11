import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { publishFaustArtifact } from "./faust-build/lib/publishFaustArtifact.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const compilerScript = resolve(repoRoot, "node_modules/@grame/faustwasm/scripts/faust2wasm.js");
const targets = [
  {
    input: "faust/prism-premium-mono.dsp",
    output: resolve(repoRoot, "src/generated/faust/mono"),
    runtimeOutput: resolve(repoRoot, "public/faust/mono")
  },
  {
    input: "faust/prism-premium-stereo.dsp",
    output: resolve(repoRoot, "src/generated/faust/stereo"),
    runtimeOutput: resolve(repoRoot, "public/faust/stereo")
  }
];

for (const target of targets) {
  await buildTarget(target);
}

async function buildTarget(target) {
  const stagingRoot = await createStagingDirectory(target.output);
  const stagingOutput = join(stagingRoot, basename(target.output));

  try {
    await mkdir(stagingOutput, { recursive: true });
    await run(process.execPath, [compilerScript, target.input, stagingOutput, "-no-template"]);
    await generateMetadataWrapper(stagingOutput);

    await publishOutputs(stagingOutput, target.output, ["dsp-meta.json", "dsp-meta.ts", "dsp-module.wasm"]);
    await publishOutputs(stagingOutput, target.runtimeOutput, ["dsp-meta.json", "dsp-module.wasm"]);
  } finally {
    await withFsRetries(() => rm(stagingRoot, { recursive: true, force: true }));
  }
}

async function createStagingDirectory(outputDirectory) {
  const tempRoot = join(tmpdir(), "volume-booster-faust-build");
  await mkdir(tempRoot, { recursive: true });
  return mkdtemp(join(tempRoot, `${basename(outputDirectory)}-`));
}

async function publishOutputs(sourceDirectory, destinationDirectory, fileNames) {
  await mkdir(destinationDirectory, { recursive: true });

  for (const fileName of fileNames) {
    const sourcePath = resolve(sourceDirectory, fileName);
    const destinationPath = resolve(destinationDirectory, fileName);
    await withFsRetries(() => publishFaustArtifact(sourcePath, destinationPath));
  }
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
