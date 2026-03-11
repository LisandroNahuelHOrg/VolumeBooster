import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { EOL } from "node:os";
import { dirname, extname } from "node:path";

export async function publishFaustArtifact(sourcePath, destinationPath) {
  await mkdir(dirname(destinationPath), { recursive: true });

  const textExtensions = new Set([".json", ".ts"]);
  const extension = extname(destinationPath).toLowerCase();

  if (!textExtensions.has(extension)) {
    const nextBuffer = await readFile(sourcePath);
    const currentBuffer = await readFile(destinationPath).catch(() => null);
    if (currentBuffer && Buffer.compare(nextBuffer, currentBuffer) === 0) {
      return false;
    }

    await copyFile(sourcePath, destinationPath);
    return true;
  }

  const sourceText = await readFile(sourcePath, "utf8");
  const currentText = await readFile(destinationPath, "utf8").catch(() => null);
  const preferredEol = currentText?.includes("\r\n") ? "\r\n" : currentText?.includes("\n") ? "\n" : EOL;
  const normalizedText = sourceText.replace(/\r\n/g, "\n").replace(/\n/g, preferredEol);

  if (currentText === normalizedText) {
    return false;
  }

  await writeFile(destinationPath, normalizedText, "utf8");
  return true;
}
