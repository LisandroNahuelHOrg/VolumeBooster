<#
.SYNOPSIS
    Ejecuta worktree ship en foreground con logging en vivo.

.DESCRIPTION
    Wrapper obligatorio para agentes: fuerza `-Foreground` y duplica salida con
    `Tee-Object` hacia `.agent/0. Agents Brain/diagnostics/worktree-manager/live-<ts>.log`.
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("feat", "fix", "chore", "refactor", "test", "docs", "perf", "ci")]
    [string]$Type,

    [Parameter(Position = 1, Mandatory = $true)]
    [string]$Agent,

    [Parameter(Position = 2, Mandatory = $true)]
    [string]$Scope
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$managerScript = Join-Path $repoRoot "scripts\worktree-manager.ps1"
$diagDir = Join-Path $repoRoot ".agent\0. Agents Brain\diagnostics\worktree-manager"

if (-not (Test-Path $managerScript)) {
    throw "❌ No se encontró script manager: $managerScript"
}

New-Item -ItemType Directory -Force -Path $diagDir | Out-Null

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $diagDir ("live-" + $ts + ".log")

Write-Host "📡 SHIP LIVE"
Write-Host "   Type:  $Type"
Write-Host "   Agent: $Agent"
Write-Host "   Scope: $Scope"
Write-Host "   Log:   $logPath"
Write-Host ""

& pwsh -File $managerScript -Command "ship" -Type $Type -Agent $Agent -Scope $Scope -Foreground 2>&1 |
    Tee-Object -FilePath $logPath
$shipExit = $LASTEXITCODE

if ($shipExit -ne 0) {
    Write-Error "❌ ship-live finalizó con error (exit=$shipExit). Log: $logPath"
    exit $shipExit
}

Write-Host ""
Write-Host "✅ ship-live completado. Log: $logPath"
