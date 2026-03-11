import { mkdir, readFile, writeFile } from "node:fs/promises";
import { EOL } from "node:os";
import { dirname } from "node:path";

export async function writeTextFileIfChanged(filePath, nextText) {
  await mkdir(dirname(filePath), { recursive: true });

  const currentText = await readFile(filePath, "utf8").catch(() => null);
  const preferredEol = currentText?.includes("\r\n") ? "\r\n" : currentText?.includes("\n") ? "\n" : EOL;
  const normalizedNextText = nextText.replace(/\r\n/g, "\n").replace(/\n/g, preferredEol);

  if (currentText === normalizedNextText) {
    return false;
  }

  await writeFile(filePath, normalizedNextText, "utf8");
  return true;
}
