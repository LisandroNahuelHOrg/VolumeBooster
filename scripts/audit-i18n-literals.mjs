/**
 * @fileoverview Auditoría estática de strings visibles hardcodeados que deben
 * vivir en el sistema i18n del proyecto.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import ts from "typescript";

const repoRoot = resolve(import.meta.dirname, "..");
const issues = [];
const allowedCallNames = new Set([
  "t",
  "tp",
  "translate",
  "message",
  "Error",
  "TypeError",
  "RangeError",
  "DOMException",
  "querySelector",
  "querySelectorAll",
  "closest",
  "matches",
  "getAttribute",
  "setAttribute",
  "setProperty",
  "getURL",
  "sendMessage"
]);

const targetFiles = [
  resolve(repoRoot, "popup.html"),
  resolve(repoRoot, "offscreen.html"),
  ...walk(resolve(repoRoot, "src", "popup")),
  ...walk(resolve(repoRoot, "src", "offscreen")),
  ...walk(resolve(repoRoot, "src", "worker")),
  ...walk(resolve(repoRoot, "src", "shared"))
].filter(shouldAuditFile);

for (const filePath of targetFiles) {
  if (filePath.endsWith(".html")) {
    auditHtml(filePath);
    continue;
  }

  auditTypeScript(filePath);
}

if (issues.length > 0) {
  console.error("i18n literal audit failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`i18n literal audit passed for ${targetFiles.length} files.`);

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function shouldAuditFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return (
    !normalized.includes("/generated/") &&
    !normalized.endsWith(".test.ts") &&
    !normalized.endsWith("/shared/constants.ts") &&
    (normalized.endsWith(".ts") || normalized.endsWith(".html"))
  );
}

function auditHtml(filePath) {
  const source = readFileSync(filePath, "utf8");
  const titleMatch = source.match(/<title>([\s\S]*?)<\/title>/i);

  if (titleMatch && titleMatch[1].trim().length > 0) {
    issues.push(`${relative(repoRoot, filePath)} contains a hardcoded <title>.`);
  }

  const textNodePattern = />\s*([^<${][^<]*[A-Za-zÀ-ÿ][^<]*)\s*</g;
  let match;

  while ((match = textNodePattern.exec(source)) !== null) {
    const value = match[1].trim();

    if (value.length > 0) {
      issues.push(`${relative(repoRoot, filePath)} contains hardcoded HTML text: "${value}".`);
    }
  }
}

function auditTypeScript(filePath) {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  visit(sourceFile);

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      inspectLiteral(node);
    }

    ts.forEachChild(node, visit);
  }

  function inspectLiteral(node) {
    const value = node.text.trim();

    if (!looksUserFacing(value) || isAllowedContext(node)) {
      return;
    }

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    issues.push(`${relative(repoRoot, filePath)}:${line + 1}:${character + 1} contains hardcoded text: "${value}".`);
  }
}

function looksUserFacing(value) {
  if (value.length === 0) {
    return false;
  }

  if (!/[A-Za-zÀ-ÿ]/.test(value)) {
    return false;
  }

  if (/[<>]/.test(value)) {
    return false;
  }

  if (/^[a-z0-9_.:/#@%+\-]+$/i.test(value)) {
    return false;
  }

  if (/^[\[\]#.:=@'"(){}$,\-]+$/.test(value)) {
    return false;
  }

  return /[\s…!?]/.test(value);
}

function isAllowedContext(node) {
  const parent = node.parent;

  if (!parent) {
    return false;
  }

  if (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isLiteralTypeNode(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isUnionTypeNode(parent)
  ) {
    return true;
  }

  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    const expression = parent.expression;

    if (ts.isIdentifier(expression) && allowedCallNames.has(expression.text)) {
      return true;
    }

    if (ts.isPropertyAccessExpression(expression) && allowedCallNames.has(expression.name.text)) {
      return true;
    }
  }

  if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
    return ["type", "content", "description", "example", "url", "justification"].includes(parent.name.text);
  }

  return false;
}
