function Read-ManagerConfig {
    param([string]$RepoRoot)

    $configPath = Join-Path $RepoRoot ".agent\worktree-manager.json"
    $defaults = [pscustomobject]@{
        preferredRemote = $null
        baseBranch = $null
        diagnosticsDir = $null
        adapter = [pscustomobject]@{ path = $null; provider = $null }
        hooks = [pscustomobject]@{ dependencyPrep = $null; preShip = $null }
    }

    if (-not (Test-Path $configPath)) { return $defaults }
    $raw = (Get-Content -Path $configPath -Raw -Encoding utf8).Trim()
    if ([string]::IsNullOrWhiteSpace($raw)) { return $defaults }

    try {
        $parsed = $raw | ConvertFrom-Json
    }
    catch {
        throw "❌ No se pudo parsear '.agent/worktree-manager.json': $($_.Exception.Message)"
    }

    return [pscustomobject]@{
        preferredRemote = "$($parsed.preferredRemote)"
        baseBranch = "$($parsed.baseBranch)"
        diagnosticsDir = "$($parsed.diagnosticsDir)"
        adapter = [pscustomobject]@{ path = "$($parsed.adapter.path)"; provider = "$($parsed.adapter.provider)" }
        hooks = [pscustomobject]@{ dependencyPrep = "$($parsed.hooks.dependencyPrep)"; preShip = "$($parsed.hooks.preShip)" }
    }
}
