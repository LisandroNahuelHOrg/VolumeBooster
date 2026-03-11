function Resolve-ManagerRepoRoot {
    param(
        [string]$RepoRootHint,
        [string]$WorkingDirectory
    )

    $candidates = @($RepoRootHint, $WorkingDirectory) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        $resolved = (& git -C $candidate rev-parse --show-toplevel 2>$null | Out-String).Trim()
        if (-not [string]::IsNullOrWhiteSpace($resolved)) { return $resolved }
    }

    throw "❌ worktree-manager debe ejecutarse dentro de un repositorio Git válido."
}
