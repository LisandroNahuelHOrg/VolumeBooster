import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("Ensure-FixedMonitorWorktree fails before deleting a foreign repo at the target path", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ensure-fixed-monitor-"));
  const mainRepo = path.join(tempRoot, "main");
  const worktreeRoot = path.join(tempRoot, "trees");
  const foreignTarget = path.join(worktreeRoot, "WorktreeDerArriba.git");
  const adapterPath = path.resolve("scripts/worktree-manager.github-adapter.ps1");
  const command = [
    `$env:WORKTREE_MANAGER_REPO_ROOT = '${mainRepo.replace(/'/gu, "''")}'`,
    `$env:WORKTREE_MANAGER_WORKTREE_ROOT = '${worktreeRoot.replace(/'/gu, "''")}'`,
    `$env:WORKTREE_MANAGER_DIAGNOSTICS_DIR = '${path.join(tempRoot, "diag").replace(/'/gu, "''")}'`,
    "$script:deleteCalled = $false",
    `. '${adapterPath.replace(/'/gu, "''")}' -Command help -Foreground`,
    "function Use-AtomicLock { param([scriptblock]$Action) & $Action }",
    "function Remove-WorktreeDirectoryRobust { param([string]$WorktreePath,[string]$BranchName,[int]$MaxAttempts=8) $script:deleteCalled = $true; return $true }",
    "$config = [pscustomobject]@{ path='" + foreignTarget.replace(/'/gu, "''") + "'; branch='monitor-der-arriba'; display='WorktreeDerArriba' }",
    "$errorText = ''",
    "try { Ensure-FixedMonitorWorktree -Config $config -FreshFromLocalMain | Out-Null } catch { $errorText = $_.Exception.Message }",
    "[pscustomobject]@{ DeleteCalled = [bool]$script:deleteCalled; ErrorText = $errorText } | ConvertTo-Json -Compress"
  ].join("; ");

  try {
    fs.mkdirSync(mainRepo, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: mainRepo, stdio: "ignore" });
    fs.writeFileSync(path.join(mainRepo, "README.md"), Buffer.from("base\n"));
    execFileSync("git", ["add", "README.md"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "base"], { cwd: mainRepo, stdio: "ignore" });
    execFileSync("git", ["init", "--bare", foreignTarget], { cwd: tempRoot, stdio: "ignore" });

    const rawOutput = execFileSync("pwsh", ["-NoProfile", "-Command", command], { encoding: "utf8" });
    expect(JSON.parse(rawOutput.trim().split(/\r?\n/u).at(-1) ?? "{}")).toMatchObject({
      DeleteCalled: false,
      ErrorText: expect.stringContaining("pertenece a otro repo")
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
