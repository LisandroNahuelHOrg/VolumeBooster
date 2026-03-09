import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";
import { DEFAULT_I18N_CONFIG, loadI18nConfig } from "./i18n-config-lib.mjs";

export const I18N_AUDIT_ALLOWED_CALL_NAMES = new Set([
  "t",
  "tp",
  "translate",
  "getI18nMessageSafe",
  "message",
  "Error",
  "TypeError",
  "RangeError",
  "DOMException",
  "MediaElementSessionError",
  "querySelector",
  "querySelectorAll",
  "closest",
  "matches",
  "getAttribute",
  "setProperty",
  "getURL",
  "sendMessage"
]);

export const I18N_AUDIT_TARGETS = [
  "popup.html",
  "offscreen.html",
  "src/popup",
  "src/offscreen",
  "src/worker",
  "src/shared",
  "src/content",
  "src/automation"
];

const HTML_TEXT_NODE_PATTERN = />\s*([^<${][^<]*[A-Za-zÀ-ÿ][^<]*)\s*</g;

export function runI18nLiteralAudit(repoRoot) {
  const config = loadI18nConfig(repoRoot);
  const issues = [];
  const targetFiles = collectI18nAuditFiles(repoRoot, config);

  for (const filePath of targetFiles) {
    if (filePath.endsWith(".html")) {
      const source = readFileSync(filePath, "utf8");
      issues.push(...auditHtmlSource(source, relative(repoRoot, filePath), config));
      continue;
    }

    const source = readFileSync(filePath, "utf8");
    issues.push(...auditTypeScriptSource(source, relative(repoRoot, filePath), config));
  }

  return { issues, targetFiles };
}

export function collectI18nAuditFiles(repoRoot, config = loadI18nConfig(repoRoot)) {
  return extractAuditTargets(config).flatMap((target) => {
    const targetPath = resolve(repoRoot, target);

    if (!existsSync(targetPath)) {
      return [];
    }

    if (isDirectory(targetPath)) {
      return walk(targetPath);
    }

    return [targetPath];
  }).filter((filePath) => shouldAuditFile(filePath, config));
}

export function auditHtmlSource(source, label, config = DEFAULT_I18N_CONFIG) {
  const issues = [];
  const titleMatch = source.match(/<title>([\s\S]*?)<\/title>/i);

  if (titleMatch && titleMatch[1].trim().length > 0) {
    issues.push(`${label} contains a hardcoded <title>.`);
  }

  collectHardcodedHtmlTexts(source).forEach((value) => {
    issues.push(`${label} contains hardcoded HTML text: "${value}".`);
  });

  collectHardcodedHtmlAttributes(source, config.includeHtmlAttributes).forEach((value) => {
    issues.push(`${label} contains hardcoded HTML attribute text: "${value}".`);
  });

  return issues;
}

export function auditTypeScriptSource(sourceText, label, config = DEFAULT_I18N_CONFIG) {
  const issues = [];
  const sourceFile = ts.createSourceFile(label, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const allowedCallNames = buildAllowedCallNames(config);

  visit(sourceFile);
  return issues;

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      inspectLiteral(node);
    }

    if (ts.isTemplateExpression(node)) {
      inspectTemplateExpression(node);
    }

    ts.forEachChild(node, visit);
  }

  function inspectLiteral(node) {
    const value = node.text.trim();

    if (ts.isNoSubstitutionTemplateLiteral(node) && value.includes("<") && value.includes(">") && !isAllowedContext(node)) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const templateLabel = `${label}:${line + 1}:${character + 1}`;
      issues.push(...auditHtmlSource(value, templateLabel, config));
      return;
    }

    if (!looksUserFacing(value) || isAllowedContext(node)) {
      return;
    }

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    issues.push(`${label}:${line + 1}:${character + 1} contains hardcoded text: "${value}".`);
  }

  function inspectTemplateExpression(node) {
    if (isAllowedContext(node)) {
      return;
    }

    const templateSource = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join("${}");

    if (!templateSource.includes("<") || !templateSource.includes(">")) {
      return;
    }

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const templateLabel = `${label}:${line + 1}:${character + 1}`;
    issues.push(...auditHtmlSource(templateSource, templateLabel, config));
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

      if (ts.isPropertyAccessExpression(expression) && expression.name.text === "setAttribute") {
        const [attributeNameNode, attributeValueNode] = parent.arguments;

        if (
          node === attributeValueNode &&
          isVisibleAttributeName(attributeNameNode, config.includeHtmlAttributes ?? DEFAULT_I18N_CONFIG.includeHtmlAttributes)
        ) {
          return false;
        }
      }

      if (ts.isIdentifier(expression) && allowedCallNames.has(expression.text)) {
        return true;
      }

      if (ts.isPropertyAccessExpression(expression) && allowedCallNames.has(expression.name.text)) {
        return true;
      }
    }

    const parentInvocation = findAncestor(node, (ancestor) => ts.isCallExpression(ancestor) || ts.isNewExpression(ancestor));

    if (parentInvocation) {
      const expression = parentInvocation.expression;

      if (ts.isIdentifier(expression) && allowedCallNames.has(expression.text)) {
        return true;
      }

      if (ts.isPropertyAccessExpression(expression) && allowedCallNames.has(expression.name.text)) {
        return true;
      }
    }

    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      if (["type", "content", "description", "example", "url", "justification"].includes(parent.name.text)) {
        return true;
      }

      if (isCssStylePropertyAssignment(parent)) {
        return true;
      }
    }

    const technicalDeclaration = findAncestor(node, ts.isVariableDeclaration);

    if (
      technicalDeclaration &&
      ts.isIdentifier(technicalDeclaration.name) &&
      technicalDeclaration.name.text.toLowerCase().includes("technical")
    ) {
      return true;
    }

    return false;
  }
}

export function looksUserFacing(value) {
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

function collectHardcodedHtmlTexts(source) {
  const matches = [];
  let match;

  while ((match = HTML_TEXT_NODE_PATTERN.exec(source)) !== null) {
    const value = match[1].trim();

    if (value.length > 0) {
      matches.push(value);
    }
  }

  return matches;
}

function collectHardcodedHtmlAttributes(source, attributes = DEFAULT_I18N_CONFIG.includeHtmlAttributes) {
  const attributePattern = new RegExp(
    `\\b(?:${attributes.map(escapeRegex).join("|")})=["']([^"'$][^"']*[A-Za-zÀ-ÿ][^"']*)["']`,
    "gi"
  );
  const matches = [];
  let match;

  while ((match = attributePattern.exec(source)) !== null) {
    const value = match[1].trim();

    if (!value.includes("=") && looksUserFacing(value)) {
      matches.push(value);
    }
  }

  return matches;
}

function isVisibleAttributeName(node, attributes) {
  if (!node || !(ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return false;
  }

  return attributes.includes(node.text.trim());
}

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

function shouldAuditFile(filePath, config = DEFAULT_I18N_CONFIG) {
  const normalized = filePath.replace(/\\/g, "/");
  const scanExtensions = new Set(config.scanExtensions ?? DEFAULT_I18N_CONFIG.scanExtensions);

  return (
    !matchesConfiguredExclude(normalized, config.excludeGlobs ?? DEFAULT_I18N_CONFIG.excludeGlobs) &&
    !normalized.endsWith("/shared/constants.ts") &&
    [...scanExtensions].some((extension) => normalized.endsWith(extension))
  );
}

function isDirectory(targetPath) {
  try {
    return readdirSync(targetPath) && true;
  } catch {
    return false;
  }
}

function isCssStylePropertyAssignment(node) {
  const objectLiteral = node.parent;

  if (!ts.isObjectLiteralExpression(objectLiteral)) {
    return false;
  }

  const satisfiesExpression = objectLiteral.parent;

  if (ts.isSatisfiesExpression(satisfiesExpression) && satisfiesExpression.type.getText().includes("CSSStyleDeclaration")) {
    return true;
  }

  const callExpression = findAncestor(objectLiteral, ts.isCallExpression);

  return Boolean(
    callExpression &&
      ts.isPropertyAccessExpression(callExpression.expression) &&
      ts.isIdentifier(callExpression.expression.expression) &&
      callExpression.expression.expression.text === "Object" &&
      callExpression.expression.name.text === "assign"
  );
}

function findAncestor(node, predicate) {
  let current = node.parent;

  while (current) {
    if (predicate(current)) {
      return current;
    }

    current = current.parent;
  }

  return null;
}

function extractAuditTargets(config) {
  const includeGlobs = config.includeGlobs ?? DEFAULT_I18N_CONFIG.includeGlobs;
  const targets = new Set();

  for (const pattern of includeGlobs) {
    const base = extractBasePath(pattern);

    if (base) {
      targets.add(base);
    }
  }

  return targets.size > 0 ? [...targets] : I18N_AUDIT_TARGETS;
}

function extractBasePath(pattern) {
  const normalized = String(pattern).replace(/\\/g, "/").trim();

  if (normalized.length === 0) {
    return null;
  }

  const wildcardIndex = normalized.search(/[*{[]/);
  const truncated = wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex);
  return truncated.replace(/\/+$/, "") || null;
}

function buildAllowedCallNames(config) {
  const configuredNames = (config.i18nCallNames ?? DEFAULT_I18N_CONFIG.i18nCallNames).flatMap((name) =>
    String(name)
      .split(".")
      .filter((part) => part.length > 0)
  );

  return new Set([...I18N_AUDIT_ALLOWED_CALL_NAMES, ...configuredNames]);
}

function matchesConfiguredExclude(normalizedPath, patterns) {
  return patterns.some((pattern) => matchesSimpleGlob(normalizedPath, pattern));
}

function matchesSimpleGlob(normalizedPath, pattern) {
  const normalizedPattern = String(pattern).replace(/\\/g, "/");

  if (normalizedPattern.startsWith("**/*.")) {
    return normalizedPath.endsWith(normalizedPattern.slice(4));
  }

  if (normalizedPattern.startsWith("**/") && normalizedPattern.endsWith("/**")) {
    return normalizedPath.includes(normalizedPattern.slice(3, -3));
  }

  if (normalizedPattern.startsWith("**/") && normalizedPattern.endsWith("*")) {
    return normalizedPath.includes(normalizedPattern.slice(3, -1));
  }

  return normalizedPath.includes(normalizedPattern.replace(/\*\*/g, "").replace(/\*/g, ""));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
