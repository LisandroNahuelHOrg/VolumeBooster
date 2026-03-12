function Resolve-ManagerLocalContext {
    param(
        [string]$RepoRootHint,
        [string]$WorkingDirectory
    )

    $resolvedRepoRoot = Resolve-ManagerRepoRoot -RepoRootHint $RepoRootHint -WorkingDirectory $WorkingDirectory
    $config = Read-ManagerConfig -RepoRoot $resolvedRepoRoot
    $baseBranch = if ([string]::IsNullOrWhiteSpace("$($config.baseBranch)")) { "main" } else { "$($config.baseBranch)".Trim() }
    $repoKey = Resolve-RepoKey -RepoRoot $resolvedRepoRoot -RemoteUrl $null
    $diagnosticsDir = if ([string]::IsNullOrWhiteSpace("$($config.diagnosticsDir)")) {
        Join-Path $resolvedRepoRoot ".agent\0. Agents Brain\diagnostics\worktree-manager"
    } elseif ([System.IO.Path]::IsPathRooted("$($config.diagnosticsDir)")) {
        "$($config.diagnosticsDir)"
    } else {
        Join-Path $resolvedRepoRoot "$($config.diagnosticsDir)"
    }
    $hookPrep = if ([string]::IsNullOrWhiteSpace("$($config.hooks.dependencyPrep)")) { $null } else { Join-Path $resolvedRepoRoot "$($config.hooks.dependencyPrep)" }
    $hookShip = if ([string]::IsNullOrWhiteSpace("$($config.hooks.preShip)")) { $null } else { Join-Path $resolvedRepoRoot "$($config.hooks.preShip)" }
    $worktreeRoot = Join-Path "D:\Local Worktrees" $repoKey
    $scopeLockFile = Join-Path $resolvedRepoRoot ".agent\worktree-scope-lock.$repoKey.json"

    return [pscustomobject]@{
        RepoRoot          = $resolvedRepoRoot
        Config            = $config
        BaseBranch        = $baseBranch
        RepoKey           = $repoKey
        DiagnosticsDir    = $diagnosticsDir
        HookDependencyPrep = $hookPrep
        HookPreShip       = $hookShip
        WorktreeRoot      = $worktreeRoot
        ScopeLockFile     = $scopeLockFile
    }
}
