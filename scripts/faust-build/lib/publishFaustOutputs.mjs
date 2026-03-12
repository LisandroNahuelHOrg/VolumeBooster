import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { publishFaustArtifact } from "./publishFaustArtifact.mjs";
import { withFaustFsRetries } from "./withFaustFsRetries.mjs";

export async function publishFaustOutputs(sourceDirectory, destinationDirectory, fileNames) {
  await mkdir(destinationDirectory, { recursive: true });

  for (const fileName of fileNames) {
    const sourcePath = resolve(sourceDirectory, fileName);
    const destinationPath = resolve(destinationDirectory, fileName);
    await withFaustFsRetries(() => publishFaustArtifact(sourcePath, destinationPath));
  }
}
