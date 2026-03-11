function Clear-IgnorableMainLocalDirtyState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [string[]]$AllowedPrefixes = @()
    )

    Push-Location $RepoPath
    try {
        $dirtyState = Test-AllowedMainLocalDirtyState -RepoPath $RepoPath -AllowedPrefixes $AllowedPrefixes
        if (-not $dirtyState.Allowed -or $dirtyState.DirtyPaths.Count -eq 0) {
            return [pscustomobject]@{
                Cleared        = $false
                RestoredPaths  = @()
                BlockedPaths   = @($dirtyState.BlockedPaths)
                MeaningfulDiff = @()
            }
        }

        $meaningfulDiff = @(
            git diff --name-only --ignore-cr-at-eol -- @($dirtyState.DirtyPaths) |
                ForEach-Object { "$_".Trim().Replace("\", "/") } |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        )
        if ($LASTEXITCODE -ne 0) {
            throw "❌ No se pudo inspeccionar el diff ignorable en '$RepoPath'."
        }

        if ($meaningfulDiff.Count -gt 0) {
            return [pscustomobject]@{
                Cleared        = $false
                RestoredPaths  = @()
                BlockedPaths   = @($dirtyState.BlockedPaths)
                MeaningfulDiff = @($meaningfulDiff)
            }
        }

        git restore --worktree --source=HEAD -- @($dirtyState.DirtyPaths) 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "❌ No se pudo restaurar el dirty state ignorable en '$RepoPath'."
        }

        return [pscustomobject]@{
            Cleared        = $true
            RestoredPaths  = @($dirtyState.DirtyPaths)
            BlockedPaths   = @()
            MeaningfulDiff = @()
        }
    }
    finally {
        Pop-Location
    }
}
