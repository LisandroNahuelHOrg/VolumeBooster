function Test-RunPRequired {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath
    )

    $packageJsonPath = Join-Path $RepoPath "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        return $false
    }

    try {
        $packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        return $false
    }

    $scriptValues = @()
    if ($packageJson.scripts) {
        $scriptValues = @(
            $packageJson.scripts.PSObject.Properties |
                ForEach-Object { "$($_.Value)" }
        )
    }
    if (@($scriptValues | Where-Object { $_ -match '(^|\s)run-p(\s|$)' }).Count -gt 0) {
        return $true
    }

    $depGroups = @($packageJson.dependencies, $packageJson.devDependencies)
    foreach ($group in $depGroups) {
        if ($null -eq $group) {
            continue
        }

        if ($group.PSObject.Properties["npm-run-all"]) {
            return $true
        }
    }

    return $false
}
