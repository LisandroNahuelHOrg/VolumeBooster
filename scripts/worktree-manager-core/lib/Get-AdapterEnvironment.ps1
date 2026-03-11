function Get-AdapterEnvironment {
    param(
        [string]$RepoRoot,
        [string]$WorktreeRoot,
        [string]$RepoKey,
        $RemoteMeta,
        [string]$BaseBranch,
        [string]$DiagnosticsDir,
        [string]$HookDependencyPrep,
        [string]$HookPreShip
    )

    $variables = [ordered]@{
        WORKTREE_MANAGER_REPO_ROOT = $RepoRoot
        WORKTREE_MANAGER_MAIN_REPO = $RepoRoot
        WORKTREE_MANAGER_WORKTREE_ROOT = $WorktreeRoot
        WORKTREE_MANAGER_TREE_ROOT = $WorktreeRoot
        WORKTREE_MANAGER_BASE_BRANCH = $BaseBranch
        WORKTREE_MANAGER_REPO_KEY = $RepoKey
        WORKTREE_MANAGER_DIAGNOSTICS_DIR = $DiagnosticsDir
        WORKTREE_MANAGER_SCOPE_LOCK_FILE = (Join-Path $RepoRoot ".agent\worktree-scope-lock.$RepoKey.json")
        WORKTREE_MANAGER_SCOPE_MUTEX_NAME = "Global\WorktreeManagerScopeLock-$RepoKey"
        WORKTREE_MANAGER_FIXED_SHIP_ALL_MUTEX_NAME = "Global\WorktreeManagerFixedShipAllLock-$RepoKey"
        WORKTREE_MANAGER_CACHE_ROOT = (Join-Path "D:\Local Worktrees\.manager-cache" $RepoKey)
    }
    $warnings = @()
    $aliases = [ordered]@{
        WORKTREE_MANAGER_FIXED_SHIP_ALL_LOG_PATH = "SPEEDSUITE_FIXED_SHIP_ALL_LOG_PATH"
        WORKTREE_MANAGER_SHIP_FORCE_ROUTE = "SPEEDSUITE_SHIP_FORCE_ROUTE"
        WORKTREE_MANAGER_SHIP_CI_RESUME = "SPEEDSUITE_SHIP_CI_RESUME"
        WORKTREE_MANAGER_SHIP_CI_RESUME_FAIL_MODE = "SPEEDSUITE_SHIP_CI_RESUME_FAIL_MODE"
        WORKTREE_MANAGER_SHIP_CI_RESUME_MAX_RERUNS = "SPEEDSUITE_SHIP_CI_RESUME_MAX_RERUNS"
        WORKTREE_MANAGER_SHIP_CI_RESUME_POLL_SECONDS = "SPEEDSUITE_SHIP_CI_RESUME_POLL_SECONDS"
        WORKTREE_MANAGER_SHIP_CI_RESUME_TARGET_CHECKS = "SPEEDSUITE_SHIP_CI_RESUME_TARGET_CHECKS"
        WORKTREE_MANAGER_SHIP_REVIEW_GATE = "SPEEDSUITE_SHIP_REVIEW_GATE"
        WORKTREE_MANAGER_SHIP_REVIEW_GATE_BLOCK_MAX = "SPEEDSUITE_SHIP_REVIEW_GATE_BLOCK_MAX"
        WORKTREE_MANAGER_SHIP_REVIEW_GATE_BOT_LOGINS = "SPEEDSUITE_SHIP_REVIEW_GATE_BOT_LOGINS"
        WORKTREE_MANAGER_SHIP_REVIEW_GATE_FAIL_MODE = "SPEEDSUITE_SHIP_REVIEW_GATE_FAIL_MODE"
        WORKTREE_MANAGER_SHIP_REVIEW_GATE_POLL_SECONDS = "SPEEDSUITE_SHIP_REVIEW_GATE_POLL_SECONDS"
        WORKTREE_MANAGER_SHIP_REVIEW_GATE_WAIT_SECONDS = "SPEEDSUITE_SHIP_REVIEW_GATE_WAIT_SECONDS"
        WORKTREE_MANAGER_SKIP_POST_SYNC = "SPEEDSUITE_SKIP_POST_SYNC"
    }

    if (-not [string]::IsNullOrWhiteSpace("$($RemoteMeta.Name)")) {
        $variables.WORKTREE_MANAGER_PRIMARY_REMOTE = $RemoteMeta.Name
        $variables.WORKTREE_MANAGER_BASE_REF = "$($RemoteMeta.Name)/$BaseBranch"
    }
    if (-not [string]::IsNullOrWhiteSpace($RemoteMeta.GitHubRepo)) { $variables.WORKTREE_MANAGER_GITHUB_REPO = $RemoteMeta.GitHubRepo }
    if (-not [string]::IsNullOrWhiteSpace($HookDependencyPrep)) { $variables.WORKTREE_MANAGER_HOOK_DEPENDENCY_PREP = $HookDependencyPrep }
    if (-not [string]::IsNullOrWhiteSpace($HookPreShip)) { $variables.WORKTREE_MANAGER_HOOK_PRE_SHIP = $HookPreShip }

    foreach ($pair in $aliases.GetEnumerator()) {
        $newValue = (Get-Item "Env:$($pair.Key)" -ErrorAction SilentlyContinue).Value
        $oldValue = (Get-Item "Env:$($pair.Value)" -ErrorAction SilentlyContinue).Value
        $selected = if (-not [string]::IsNullOrWhiteSpace($newValue)) { $newValue } else { $oldValue }
        if ([string]::IsNullOrWhiteSpace($newValue) -and -not [string]::IsNullOrWhiteSpace($oldValue)) {
            $warnings += "⚠️ '$($pair.Value)' está deprecado. Usar '$($pair.Key)'."
        }
        if (-not [string]::IsNullOrWhiteSpace($selected)) {
            $variables[$pair.Key] = $selected
            $variables[$pair.Value] = $selected
        }
    }

    return [pscustomobject]@{
        Variables = $variables
        Warnings = $warnings
    }
}
