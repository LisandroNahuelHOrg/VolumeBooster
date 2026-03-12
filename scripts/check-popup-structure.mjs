import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

async function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const targets = [
    path.join(rootDir, "src", "popup", "main.ts"),
    path.join(rootDir, "src", "popup", "internal", "runtime"),
    path.join(rootDir, "src", "popup", "internal", "controller"),
    path.join(rootDir, "src", "popup", "internal", "commands"),
    path.join(rootDir, "src", "popup", "internal", "commits"),
    path.join(rootDir, "src", "popup", "internal", "events")
  ];
  const files = [];
  const stack = [];

  for (const target of targets) {
    stack.push(target);
  }

  while (stack.length > 0) {
    const currentPath = stack.pop();

    if (!currentPath) {
      continue;
    }

    let stats = null;

    try {
      stats = await readdir(currentPath, { withFileTypes: true });
    } catch {
      stats = null;
    }

    if (stats === null) {
      if (currentPath.endsWith(".ts") && !currentPath.endsWith(".test.ts")) {
        files.push(currentPath);
      }
      continue;
    }

    for (const entry of stats) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        files.push(entryPath);
      }
    }
  }

  const failures = [];

  for (const filePath of files) {
    const sourceText = await readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
    const lineCount = sourceText === "" ? 0 : sourceText.split(/\r?\n/u).length;
    let functionCount = 0;
    const nodeStack = [sourceFile];

    while (nodeStack.length > 0) {
      const node = nodeStack.pop();

      if (!node) {
        continue;
      }

      if (
        ts.isArrowFunction(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isMethodDeclaration(node)
      ) {
        functionCount += 1;
      }

      const children = node.getChildren(sourceFile);

      for (let index = children.length - 1; index >= 0; index -= 1) {
        nodeStack.push(children[index]);
      }
    }

    if (lineCount > 150 || functionCount > 1) {
      failures.push({
        filePath: path.relative(rootDir, filePath),
        functionCount,
        lineCount
      });
    }
  }

  if (failures.length === 0) {
    console.log("Popup structure check passed.");
    return;
  }

  console.error("Popup structure check failed:");

  for (const failure of failures) {
    console.error(
      `${failure.filePath} (lines=${failure.lineCount}, functions=${failure.functionCount})`
    );
  }

  process.exitCode = 1;
}

await main();
