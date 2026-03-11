function Resolve-BaseBranch {
    param(
        [string]$RepoRoot,
        [string]$RemoteName,
        [string]$BaseBranchOverride
    )

    if (-not [string]::IsNullOrWhiteSpace($BaseBranchOverride)) { return $BaseBranchOverride.Trim() }

    $symbolicRef = (& git -C $RepoRoot symbolic-ref "refs/remotes/$RemoteName/HEAD" 2>$null | Out-String).Trim()
    if ($symbolicRef -match "/([^/]+)$") { return $Matches[1] }
    return "main"
}
