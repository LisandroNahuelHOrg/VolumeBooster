function Invoke-VerifiedProductionBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$BranchLabel,
        [string[]]$RequiredRelativePaths = @()
    )

    Push-Location $RepoPath
    try {
        Ensure-RepoBuildToolingReady -RepoPath $RepoPath -ContextLabel $BranchLabel
        Write-Host "🔨 Compilando build de producción en '$BranchLabel'..."
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "⚠️ Build falló en '$BranchLabel'."
            return $false
        }

        $missing = @(
            $RequiredRelativePaths |
                Where-Object {
                    -not (Test-Path (Join-Path $RepoPath $_))
                }
        )
        if ($missing.Count -gt 0) {
            $missingList = $missing -join ", "
            Write-Warning "⚠️ Build completó pero faltan artefactos críticos en '$BranchLabel': $missingList"
            return $false
        }

        Write-Host "✅ Build exitoso. '$BranchLabel' tiene los artefactos críticos esperados."
        return $true
    }
    finally {
        Pop-Location
    }
}
