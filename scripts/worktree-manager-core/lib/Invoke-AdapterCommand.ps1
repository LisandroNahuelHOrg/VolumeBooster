function Invoke-AdapterCommand {
    param(
        [string]$AdapterPath,
        [string]$Command,
        [string]$Type,
        [string]$Agent,
        [string]$Scope,
        [switch]$BackgroundChild,
        [switch]$Foreground,
        $EnvironmentResult
    )

    $previous = @{}
    foreach ($name in $EnvironmentResult.Variables.Keys) {
        $previous[$name] = (Get-Item "Env:$name" -ErrorAction SilentlyContinue).Value
        Set-Item -Path "Env:$name" -Value "$($EnvironmentResult.Variables[$name])"
    }

    foreach ($warning in $EnvironmentResult.Warnings) { Write-Warning $warning }

    try {
        & $AdapterPath `
            -Command $Command `
            -Type $Type `
            -Agent $Agent `
            -Scope $Scope `
            -BackgroundChild:$BackgroundChild `
            -Foreground:$Foreground
        return $(if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE })
    }
    finally {
        foreach ($name in $EnvironmentResult.Variables.Keys) {
            if ($null -eq $previous[$name]) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue } else { Set-Item "Env:$name" -Value $previous[$name] }
        }
    }
}
