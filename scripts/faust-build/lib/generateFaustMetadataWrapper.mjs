import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { withFaustFsRetries } from "./withFaustFsRetries.mjs";

export async function generateFaustMetadataWrapper(outputDirectory) {
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

  await withFaustFsRetries(() => writeFile(wrapperPath, wrapperSource, "utf8"));
}
