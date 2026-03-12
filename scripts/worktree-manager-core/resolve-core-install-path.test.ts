import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("Resolve-CoreInstallPath uses absolute overrides, falls back to user home, and rejects relative overrides", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-core-install-path-"));
  const tempHome = path.join(tempRoot, "home");
  const tempHomeFromEnv = path.join(tempRoot, "home-from-env");
  const tempInstall = path.join(tempRoot, "override", "manager-core");
  const helperPath = path.resolve("scripts/worktree-manager-core/lib/Resolve-CoreInstallPath.ps1");
  const command = [
    `. '${helperPath.replace(/'/gu, "''")}'`,
    "Remove-Item Env:WORKTREE_MANAGER_CORE_INSTALL -ErrorAction SilentlyContinue",
    `$env:USERPROFILE = '${tempHome.replace(/'/gu, "''")}'`,
    "Remove-Item Env:HOME -ErrorAction SilentlyContinue",
    "$defaultPath = Resolve-CoreInstallPath",
    `$env:USERPROFILE = 'relative-home'`,
    `$env:HOME = '${tempHomeFromEnv.replace(/'/gu, "''")}'`,
    "$homeFallbackPath = Resolve-CoreInstallPath",
    `$env:WORKTREE_MANAGER_CORE_INSTALL = '${tempInstall.replace(/'/gu, "''")}'`,
    "$overridePath = Resolve-CoreInstallPath",
    "$relativeError = ''",
    "$env:WORKTREE_MANAGER_CORE_INSTALL = 'relative\\manager-core'",
    "try { Resolve-CoreInstallPath | Out-Null } catch { $relativeError = $_.Exception.Message }",
    "[pscustomobject]@{ DefaultPath = $defaultPath; HomeFallbackPath = $homeFallbackPath; OverridePath = $overridePath; RelativeError = $relativeError } | ConvertTo-Json -Compress"
  ].join("; ");

  try {
    fs.mkdirSync(tempHome, { recursive: true });
    fs.mkdirSync(tempHomeFromEnv, { recursive: true });
    expect(JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", command], { encoding: "utf8" }))).toMatchObject({
      DefaultPath: path.join(tempHome, ".codex", "tools", "worktree-manager"),
      HomeFallbackPath: path.join(tempHomeFromEnv, ".codex", "tools", "worktree-manager"),
      OverridePath: tempInstall,
      RelativeError: expect.stringContaining("ruta absoluta")
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
