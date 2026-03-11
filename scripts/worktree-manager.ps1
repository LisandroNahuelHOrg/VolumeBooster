param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("create", "ship", "list", "cleanup", "scope-check", "fixed-open", "fixed-ship", "fixed-ship-all", "fixed-list", "help")]
    [string]$Command,
    [Parameter(Position = 1)]
    [string]$Type,
    [Parameter(Position = 2)]
    [string]$Agent,
    [Parameter(Position = 3)]
    [string]$Scope,
    [switch]$BackgroundChild,
    [switch]$Foreground
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$coreSource = Join-Path $repoRoot "scripts\worktree-manager-core"
$coreInstall = "C:\Users\Lisandro\.codex\tools\worktree-manager"
$coreEntry = Join-Path $coreInstall "invoke.ps1"
$adapterPath = Join-Path $repoRoot "scripts\worktree-manager.github-adapter.ps1"

if (Test-Path $coreSource) {
    New-Item -ItemType Directory -Path $coreInstall -Force | Out-Null
    Copy-Item -Path (Join-Path $coreSource "*") -Destination $coreInstall -Recurse -Force
}

if (-not (Test-Path $coreEntry)) {
    throw "❌ No se encontró el core universal: $coreEntry"
}

if (-not (Test-Path $adapterPath)) {
    throw "❌ No se encontró el adapter GitHub: $adapterPath"
}

& $coreEntry `
    -Command $Command `
    -Type $Type `
    -Agent $Agent `
    -Scope $Scope `
    -RepoRoot $repoRoot `
    -AdapterPath $adapterPath `
    -BackgroundChild:$BackgroundChild `
    -Foreground:$Foreground
exit $LASTEXITCODE
