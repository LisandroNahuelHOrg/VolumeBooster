function Ensure-RepoBuildToolingReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [string]$ContextLabel = "repo-build"
    )

    $requiredPaths = @(
        "node_modules\vite\bin\vite.js"
    )
    $missing = @(
        $requiredPaths |
            Where-Object {
                -not (Test-Path (Join-Path $RepoPath $_))
            }
    )
    if ($missing.Count -eq 0) {
        return
    }

    $missingList = $missing -join ", "
    Write-Warning "⚠️ Dependencias de build incompletas para '$ContextLabel': $missingList"

    Push-Location $RepoPath
    try {
        npm install --prefer-offline --no-audit --no-fund 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "❌ npm install no pudo reparar las dependencias de build en '$ContextLabel'."
        }
    }
    finally {
        Pop-Location
    }
}
