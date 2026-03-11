import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "vitest";

test("Get-AdapterEnvironment omits remote-only variables when RemoteMeta is absent", () => {
  const helperPath = path.resolve("scripts/worktree-manager-core/lib/Get-AdapterEnvironment.ps1");
  const command = [
    `. '${helperPath.replace(/'/gu, "''")}'`,
    "$result = Get-AdapterEnvironment -RepoRoot 'C:\\repo' -WorktreeRoot 'D:\\Local Worktrees\\repo' -RepoKey 'repo' -RemoteMeta $null -BaseBranch 'main' -DiagnosticsDir 'C:\\repo\\.agent\\diag'",
    "$result.Variables | ConvertTo-Json -Compress -Depth 5"
  ].join("; ");
  const output = execFileSync("pwsh", ["-NoProfile", "-Command", command], { encoding: "utf8" });
  const variables = JSON.parse(output) as Record<string, string>;

  expect(variables.WORKTREE_MANAGER_BASE_BRANCH).toBe("main");
  expect(variables.WORKTREE_MANAGER_REPO_KEY).toBe("repo");
  expect("WORKTREE_MANAGER_PRIMARY_REMOTE" in variables).toBe(false);
  expect("WORKTREE_MANAGER_BASE_REF" in variables).toBe(false);
  expect("WORKTREE_MANAGER_GITHUB_REPO" in variables).toBe(false);
});
