function Get-ManagerCapabilities {
    param(
        [string]$RepoRoot,
        [string]$BaseBranch,
        [string]$WorktreeRoot,
        [string]$RepoKey,
        [string]$ScopeLockFilePath
    )

    return [pscustomobject]@{
        manager_version            = "2.0.0"
        manager_runtime            = "pwsh"
        supports_ship              = $true
        supports_fixed_monitors    = $true
        supports_main_autosanitize = $true
        supports_sanitize_main     = $true
        canonical_main_repo_path   = $RepoRoot
        base_branch                = $BaseBranch
        fixed_monitor_root_mode    = "repo-scoped"
        repo_key                   = $RepoKey
        worktree_root              = $WorktreeRoot
        scope_lock_file_path       = $ScopeLockFilePath
    }
}
