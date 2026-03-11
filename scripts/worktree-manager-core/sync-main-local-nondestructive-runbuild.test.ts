import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("Sync-MainLocalNonDestructive only rebuilds after fetching a fresh base ref", { timeout: 20000 }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sync-main-local-"));
  const remoteRepo = path.join(tempRoot, "remote.git");
  const seedRepo = path.join(tempRoot, "seed");
  const staleClone = path.join(tempRoot, "stale-clone");
  const alignedClone = path.join(tempRoot, "aligned-clone");
  const adapterPath = path.resolve("scripts/worktree-manager.github-adapter.ps1");
  const syncCommandBase = [
    "$script:buildInvoked = $false",
    `. '${adapterPath.replace(/'/gu, "''")}' -Command help -Foreground`,
    "function Invoke-VerifiedProductionBuild { param([string]$RepoPath,[string]$BranchLabel,[string[]]$RequiredRelativePaths=@()) $script:buildInvoked = $true; return $true }",
    "$result = Sync-MainLocalNonDestructive -RunBuild",
    "[pscustomobject]@{ Result = [bool]$result; BuildInvoked = [bool]$script:buildInvoked } | ConvertTo-Json -Compress"
  ].join("; ");

  try {
    execFileSync("git", ["init", "--bare", remoteRepo], { stdio: "ignore" });
    fs.mkdirSync(seedRepo, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: seedRepo, stdio: "ignore" });
    fs.mkdirSync(path.join(seedRepo, "public", "faust"), { recursive: true });
    fs.writeFileSync(path.join(seedRepo, "README.md"), Buffer.from("base\n"));
    fs.writeFileSync(path.join(seedRepo, "public", "faust", "fixture.txt"), Buffer.from("base\n"));
    execFileSync("git", ["add", "README.md", "public/faust/fixture.txt"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "base"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["remote", "add", "origin", remoteRepo], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["push", "-u", "origin", "main"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["symbolic-ref", "HEAD", "refs/heads/main"], { cwd: remoteRepo, stdio: "ignore" });
    execFileSync("git", ["clone", remoteRepo, staleClone], { stdio: "ignore" });
    fs.writeFileSync(path.join(seedRepo, "README.md"), Buffer.from("base\nremote\n"));
    execFileSync("git", ["commit", "-am", "remote"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["push", "origin", "main"], { cwd: seedRepo, stdio: "ignore" });
    fs.writeFileSync(path.join(staleClone, "public", "faust", "fixture.txt"), Buffer.from("changed\n"));

    const staleCommand = [
      `$env:WORKTREE_MANAGER_REPO_ROOT = '${staleClone.replace(/'/gu, "''")}'`,
      `$env:WORKTREE_MANAGER_WORKTREE_ROOT = '${path.join(tempRoot, "trees-stale").replace(/'/gu, "''")}'`,
      `$env:WORKTREE_MANAGER_DIAGNOSTICS_DIR = '${path.join(tempRoot, "diag-stale").replace(/'/gu, "''")}'`,
      syncCommandBase
    ].join("; ");
    const staleRaw = execFileSync("pwsh", ["-NoProfile", "-Command", staleCommand], { encoding: "utf8" });
    const stalePayload = JSON.parse(staleRaw.trim().split(/\r?\n/u).at(-1) ?? "{}");
    expect(stalePayload).toMatchObject({ Result: false, BuildInvoked: false });

    execFileSync("git", ["clone", remoteRepo, alignedClone], { stdio: "ignore" });
    fs.writeFileSync(path.join(alignedClone, "public", "faust", "fixture.txt"), Buffer.from("changed\n"));
    const alignedCommand = [
      `$env:WORKTREE_MANAGER_REPO_ROOT = '${alignedClone.replace(/'/gu, "''")}'`,
      `$env:WORKTREE_MANAGER_WORKTREE_ROOT = '${path.join(tempRoot, "trees-aligned").replace(/'/gu, "''")}'`,
      `$env:WORKTREE_MANAGER_DIAGNOSTICS_DIR = '${path.join(tempRoot, "diag-aligned").replace(/'/gu, "''")}'`,
      syncCommandBase
    ].join("; ");
    const alignedRaw = execFileSync("pwsh", ["-NoProfile", "-Command", alignedCommand], { encoding: "utf8" });
    const alignedPayload = JSON.parse(alignedRaw.trim().split(/\r?\n/u).at(-1) ?? "{}");
    expect(alignedPayload).toMatchObject({ Result: true, BuildInvoked: true });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
