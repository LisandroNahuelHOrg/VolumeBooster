import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("Assert-ManagedPathIsNotForeignRepo allows same-repo worktrees and rejects foreign repos", { timeout: 30000 }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "assert-managed-path-"));
  const mainRepo = path.join(tempRoot, "main");
  const worktreePath = path.join(tempRoot, "main-worktree");
  const foreignRepo = path.join(tempRoot, "foreign");
  const foreignBareRepo = path.join(tempRoot, "foreign-bare.git");
  const nonGitPath = path.join(tempRoot, "plain");
  const getTopLevelPath = path.resolve("scripts/worktree-manager-core/lib/Get-PathGitTopLevel.ps1");
  const assertPath = path.resolve("scripts/worktree-manager-core/lib/Assert-ManagedPathIsNotForeignRepo.ps1");
  const command = [
    `$repoRoot = '${mainRepo.replace(/'/gu, "''")}'`,
    `$env:GIT_CEILING_DIRECTORIES = '${tempRoot.replace(/'/gu, "''")}'`,
    `. '${getTopLevelPath.replace(/'/gu, "''")}'`,
    `. '${assertPath.replace(/'/gu, "''")}'`,
    "Assert-ManagedPathIsNotForeignRepo -PathUnderCheck '" + path.join(tempRoot, "missing").replace(/'/gu, "''") + "' -RepoRoot $repoRoot",
    "Assert-ManagedPathIsNotForeignRepo -PathUnderCheck '" + nonGitPath.replace(/'/gu, "''") + "' -RepoRoot $repoRoot",
    "Assert-ManagedPathIsNotForeignRepo -PathUnderCheck '" + mainRepo.replace(/'/gu, "''") + "' -RepoRoot $repoRoot",
    "Assert-ManagedPathIsNotForeignRepo -PathUnderCheck '" + worktreePath.replace(/'/gu, "''") + "' -RepoRoot $repoRoot",
    "$errorText = ''",
    "$bareErrorText = ''",
    "try { Assert-ManagedPathIsNotForeignRepo -PathUnderCheck '" + foreignRepo.replace(/'/gu, "''") + "' -RepoRoot $repoRoot } catch { $errorText = $_.Exception.Message }",
    "try { Assert-ManagedPathIsNotForeignRepo -PathUnderCheck '" + foreignBareRepo.replace(/'/gu, "''") + "' -RepoRoot $repoRoot } catch { $bareErrorText = $_.Exception.Message }",
    "[pscustomobject]@{ ErrorText = $errorText; BareErrorText = $bareErrorText } | ConvertTo-Json -Compress"
  ].join("; ");

  try {
    fs.mkdirSync(mainRepo, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: mainRepo, stdio: "ignore" });
    fs.writeFileSync(path.join(mainRepo, "README.md"), Buffer.from("base\n"));
    execFileSync("git", ["add", "README.md"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "base"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["worktree", "add", worktreePath, "-b", "feature/monitor-guard", "main"], { cwd: mainRepo, stdio: "ignore" });
    fs.mkdirSync(nonGitPath, { recursive: true });
    fs.mkdirSync(foreignRepo, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: foreignRepo, stdio: "ignore" });
    execFileSync("git", ["init", "--bare", foreignBareRepo], { cwd: tempRoot, stdio: "ignore" });

    expect(JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", command], { encoding: "utf8" }))).toMatchObject({
      ErrorText: expect.stringContaining("pertenece a otro repo"),
      BareErrorText: expect.stringContaining("pertenece a otro repo")
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
