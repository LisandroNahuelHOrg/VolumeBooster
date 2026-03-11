import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("Clear-IgnorableMainLocalDirtyState handles staged-only noise without hiding meaningful staged changes", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "clear-ignorable-main-local-"));
  const trackedRelativePath = "public/faust/fixture.txt";
  const trackedFilePath = path.join(repoRoot, "public", "faust", "fixture.txt");
  const helperPath = path.resolve("scripts/worktree-manager-core/lib/Clear-IgnorableMainLocalDirtyState.ps1");
  const detectorPath = path.resolve("scripts/worktree-manager-core/lib/Test-AllowedMainLocalDirtyState.ps1");
  const helperCommand = [
    `$repoPath = '${repoRoot.replace(/'/gu, "''")}'`,
    `. '${detectorPath.replace(/'/gu, "''")}'`,
    `. '${helperPath.replace(/'/gu, "''")}'`,
    "$result = Clear-IgnorableMainLocalDirtyState -RepoPath $repoPath -AllowedPrefixes @('public/faust/')",
    "$result | ConvertTo-Json -Compress -Depth 5"
  ].join("; ");

  try {
    fs.mkdirSync(path.dirname(trackedFilePath), { recursive: true });
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: repoRoot, stdio: "ignore" });
    fs.writeFileSync(trackedFilePath, Buffer.from("alpha\n"));
    execFileSync("git", ["add", trackedRelativePath], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "baseline"], { cwd: repoRoot, stdio: "ignore" });

    fs.writeFileSync(trackedFilePath, Buffer.from("alpha\r\n"));
    execFileSync("git", ["add", trackedRelativePath], { cwd: repoRoot, stdio: "ignore" });
    expect(execFileSync("git", ["status", "--porcelain", "--", trackedRelativePath], { cwd: repoRoot, encoding: "utf8" })).toMatch(/^M  /u);

    expect(
      JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", helperCommand], { cwd: repoRoot, encoding: "utf8" }))
    ).toMatchObject({
      Cleared: true,
      RestoredPaths: [trackedRelativePath],
      BlockedPaths: [],
      MeaningfulDiff: []
    });
    expect(execFileSync("git", ["status", "--porcelain", "--", trackedRelativePath], { cwd: repoRoot, encoding: "utf8" })).toBe("");

    fs.writeFileSync(trackedFilePath, Buffer.from("beta\n"));
    execFileSync("git", ["add", trackedRelativePath], { cwd: repoRoot, stdio: "ignore" });
    expect(
      JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", helperCommand], { cwd: repoRoot, encoding: "utf8" }))
    ).toMatchObject({
      Cleared: false,
      BlockedPaths: [],
      MeaningfulDiff: [trackedRelativePath]
    });
    expect(execFileSync("git", ["status", "--porcelain", "--", trackedRelativePath], { cwd: repoRoot, encoding: "utf8" })).toMatch(/^M  /u);

    execFileSync("git", ["restore", "--staged", "--worktree", "--source=HEAD", "--", trackedRelativePath], {
      cwd: repoRoot,
      stdio: "ignore"
    });
    fs.writeFileSync(trackedFilePath, Buffer.from("alpha\r\n"));
    expect(execFileSync("git", ["status", "--porcelain", "--", trackedRelativePath], { cwd: repoRoot, encoding: "utf8" })).toMatch(/^ M /u);

    expect(
      JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", helperCommand], { cwd: repoRoot, encoding: "utf8" }))
    ).toMatchObject({
      Cleared: true,
      RestoredPaths: [trackedRelativePath],
      BlockedPaths: [],
      MeaningfulDiff: []
    });
    expect(execFileSync("git", ["status", "--porcelain", "--", trackedRelativePath], { cwd: repoRoot, encoding: "utf8" })).toBe("");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
