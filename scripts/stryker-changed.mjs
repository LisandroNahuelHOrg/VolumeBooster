import { spawn } from "node:child_process";

const changedFiles = await collectChangedFiles();
const mutatedFiles = filterMutatableFiles(changedFiles);

if (mutatedFiles.length === 0) {
  console.log("No changed production files to mutate.");
  process.exit(0);
}

await runStryker(mutatedFiles);

async function collectChangedFiles() {
  const outputs = await Promise.all([
    runGit(["diff", "--name-only", "--diff-filter=ACMRTUXB", "origin/main...HEAD"]).catch(() => ""),
    runGit(["diff", "--name-only", "--diff-filter=ACMRTUXB"]).catch(() => ""),
    runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"]).catch(() => ""),
    runGit(["ls-files", "--others", "--exclude-standard"]).catch(() => "")
  ]);

  return [...new Set(outputs.flatMap(splitLines))];
}

function filterMutatableFiles(files) {
  return files.filter((file) => {
    const normalized = file.replace(/\\/g, "/");

    if (!normalized.startsWith("src/") || !normalized.endsWith(".ts")) {
      return false;
    }

    if (
      normalized.endsWith(".test.ts") ||
      normalized.includes("/__tests__/") ||
      normalized.includes("/generated/") ||
      normalized.endsWith("/main.ts") ||
      normalized.includes("/types/")
    ) {
      return false;
    }

    return true;
  });
}

function splitLines(value) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function runGit(args) {
  return new Promise((resolve, reject) => {
    const git = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    git.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    git.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    git.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr || `git ${args.join(" ")} failed with code ${code}`));
    });
  });
}

function runStryker(files) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "npx stryker run" : "npx", process.platform === "win32" ? [] : ["stryker", "run"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        STRYKER_MUTATE: files.join(",")
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Stryker changed run failed with exit code ${code}`));
    });
  });
}
