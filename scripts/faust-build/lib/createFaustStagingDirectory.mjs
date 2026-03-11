import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

export async function createFaustStagingDirectory(outputDirectory) {
  const tempRoot = join(tmpdir(), "volume-booster-faust-build");
  await mkdir(tempRoot, { recursive: true });
  return mkdtemp(join(tempRoot, `${basename(outputDirectory)}-`));
}
