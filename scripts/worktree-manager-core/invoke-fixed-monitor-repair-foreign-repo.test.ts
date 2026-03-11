import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("Invoke-FixedMonitorRepair rejects foreign target repos and ignores foreign legacy paths", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fixed-monitor-repair-"));
  const mainRepo = path.join(tempRoot, "main");
  const worktreeRoot = path.join(tempRoot, "trees");
  const foreignTarget = path.join(worktreeRoot, "WorktreeDerArriba.git");
  const foreignLegacy = path.join(tempRoot, "foreign-legacy");
  const repairPath = path.resolve("scripts/worktree-manager-core/lib/Invoke-FixedMonitorRepair.ps1");
  const registryPath = path.resolve("scripts/worktree-manager-core/lib/Get-WorktreeRegistry.ps1");
  const legacyPath = path.resolve("scripts/worktree-manager-core/lib/Get-LegacyMonitorPaths.ps1");
  const cleanPath = path.resolve("scripts/worktree-manager-core/lib/Test-WorktreeClean.ps1");
  const getTopLevelPath = path.resolve("scripts/worktree-manager-core/lib/Get-PathGitTopLevel.ps1");
  const assertPath = path.resolve("scripts/worktree-manager-core/lib/Assert-ManagedPathIsNotForeignRepo.ps1");
  const rejectCommand = [
    `. '${registryPath.replace(/'/gu, "''")}'`,
    `. '${legacyPath.replace(/'/gu, "''")}'`,
    `. '${cleanPath.replace(/'/gu, "''")}'`,
    `. '${getTopLevelPath.replace(/'/gu, "''")}'`,
    `. '${assertPath.replace(/'/gu, "''")}'`,
    `. '${repairPath.replace(/'/gu, "''")}'`,
    "function Get-LegacyMonitorPaths { param([string]$Display,[string]$TargetPath) return @($TargetPath) }",
    "$defs = [ordered]@{ 'der-arriba' = [pscustomobject]@{ key='der-arriba'; display='WorktreeDerArriba'; branch='monitor-der-arriba'; path='" + foreignTarget.replace(/'/gu, "''") + "' } }",
    "$errorText = ''",
    "try { Invoke-FixedMonitorRepair -RepoRoot '" + mainRepo.replace(/'/gu, "''") + "' -WorktreeRoot '" + worktreeRoot.replace(/'/gu, "''") + "' -MonitorKeys @('der-arriba') -Definitions $defs } catch { $errorText = $_.Exception.Message }",
    "[pscustomobject]@{ ErrorText = $errorText } | ConvertTo-Json -Compress"
  ].join("; ");
  const ignoreCommand = [
    `. '${registryPath.replace(/'/gu, "''")}'`,
    `. '${legacyPath.replace(/'/gu, "''")}'`,
    `. '${cleanPath.replace(/'/gu, "''")}'`,
    `. '${getTopLevelPath.replace(/'/gu, "''")}'`,
    `. '${assertPath.replace(/'/gu, "''")}'`,
    `. '${repairPath.replace(/'/gu, "''")}'`,
    "function Get-LegacyMonitorPaths { param([string]$Display,[string]$TargetPath) return @($TargetPath, '" + foreignLegacy.replace(/'/gu, "''") + "') }",
    "$defs = [ordered]@{ 'izq-arriba' = [pscustomobject]@{ key='izq-arriba'; display='WorktreeIzqArriba'; branch='monitor-izq-arriba'; path='" + path.join(worktreeRoot, "WorktreeIzqArriba").replace(/'/gu, "''") + "' } }",
    "Invoke-FixedMonitorRepair -RepoRoot '" + mainRepo.replace(/'/gu, "''") + "' -WorktreeRoot '" + worktreeRoot.replace(/'/gu, "''") + "' -MonitorKeys @('izq-arriba') -Definitions $defs",
    "'ok'"
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
    fs.mkdirSync(foreignLegacy, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: foreignLegacy, stdio: "ignore" });

    expect(JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", rejectCommand], { encoding: "utf8" }))).toMatchObject({
      ErrorText: expect.stringContaining("pertenece a otro repo")
    });
    expect(execFileSync("pwsh", ["-NoProfile", "-Command", ignoreCommand], { encoding: "utf8" }).trim().split(/\r?\n/u).at(-1)).toBe("ok");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
