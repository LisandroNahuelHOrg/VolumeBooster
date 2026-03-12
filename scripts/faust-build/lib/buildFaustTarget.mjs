import { basename, join } from "node:path";
import { rm } from "node:fs/promises";
import { createFaustStagingDirectory } from "./createFaustStagingDirectory.mjs";
import { generateFaustMetadataWrapper } from "./generateFaustMetadataWrapper.mjs";
import { publishFaustOutputs } from "./publishFaustOutputs.mjs";
import { runCommand } from "./runCommand.mjs";
import { withFaustFsRetries } from "./withFaustFsRetries.mjs";

export async function buildFaustTarget(target, compilerScript, stableFaustWorkspace) {
  const stagingRoot = await createFaustStagingDirectory(target.output);
  const stagingOutput = join(stagingRoot, basename(target.output));

  try {
    await runCommand(process.execPath, [compilerScript, target.input, stagingOutput, "-no-template"], stableFaustWorkspace);
    await generateFaustMetadataWrapper(stagingOutput);
    await publishFaustOutputs(stagingOutput, target.output, ["dsp-meta.json", "dsp-meta.ts", "dsp-module.wasm"]);
    await publishFaustOutputs(stagingOutput, target.runtimeOutput, ["dsp-meta.json", "dsp-module.wasm"]);
  } finally {
    await withFaustFsRetries(() => rm(stagingRoot, { recursive: true, force: true }));
  }
}
