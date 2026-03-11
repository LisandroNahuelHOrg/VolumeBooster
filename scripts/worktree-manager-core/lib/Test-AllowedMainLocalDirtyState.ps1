function Test-AllowedMainLocalDirtyState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [string[]]$AllowedPrefixes = @()
    )

    Push-Location $RepoPath
    try {
        $dirtyPaths = @(
            git status --porcelain |
                ForEach-Object {
                    if ($_.Length -lt 4) {
                        return
                    }

                    $path = $_.Substring(3).Trim().Replace("\", "/")
                    if (-not [string]::IsNullOrWhiteSpace($path)) {
                        $path
                    }
                }
        )
        if ($LASTEXITCODE -ne 0) {
            throw "❌ No se pudo inspeccionar el dirty state de '$RepoPath'."
        }

        $blockedPaths = @(
            $dirtyPaths |
                Where-Object {
                    $path = $_
                    -not @(
                        $AllowedPrefixes |
                            Where-Object { $path.StartsWith($_) }
                    )
                }
        )

        return [pscustomobject]@{
            Allowed      = $blockedPaths.Count -eq 0
            DirtyPaths   = $dirtyPaths
            BlockedPaths = $blockedPaths
        }
    }
    finally {
        Pop-Location
    }
}
