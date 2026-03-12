param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("create", "ship", "list", "cleanup", "scope-check", "fixed-open", "fixed-ship", "fixed-ship-all", "fixed-list", "help", "capabilities", "sanitize-main")]
    [string]$Command,
    [Parameter(Position = 1)]
    [string]$Type,
    [Parameter(Position = 2)]
    [string]$Agent,
    [Parameter(Position = 3)]
    [string]$Scope,
    [switch]$Json,
    [switch]$BackgroundChild,
    [switch]$Foreground
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$jsonRequested = $Json -or @($Type, $Agent, $Scope) -contains "--json"
if ($PSVersionTable.PSEdition -ne "Core") {
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($null -eq $pwsh) {
        throw "❌ worktree-manager requiere 'pwsh' para ejecución segura."
    }

    $pwshArgs = @("-NoProfile", "-File", $PSCommandPath, "-Command", $Command)
    if (-not [string]::IsNullOrWhiteSpace($Type) -and $Type -ne "--json") { $pwshArgs += @("-Type", $Type) }
    if (-not [string]::IsNullOrWhiteSpace($Agent) -and $Agent -ne "--json") { $pwshArgs += @("-Agent", $Agent) }
    if (-not [string]::IsNullOrWhiteSpace($Scope) -and $Scope -ne "--json") { $pwshArgs += @("-Scope", $Scope) }
    if ($jsonRequested) { $pwshArgs += "-Json" }
    if ($BackgroundChild) { $pwshArgs += "-BackgroundChild" }
    if ($Foreground) { $pwshArgs += "-Foreground" }

    & $pwsh.Source @pwshArgs
    exit $LASTEXITCODE
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$coreResolverPath = Join-Path $repoRoot "scripts/worktree-manager-core/lib/Resolve-CoreInstallPath.ps1"
. $coreResolverPath
$coreSource = Join-Path $repoRoot "scripts/worktree-manager-core"
$coreInstall = Resolve-CoreInstallPath
$coreEntry = Join-Path $coreInstall "invoke.ps1"
$adapterPath = Join-Path $repoRoot "scripts/worktree-manager.github-adapter.ps1"

if (Test-Path $coreSource) {
    New-Item -ItemType Directory -Path $coreInstall -Force | Out-Null
    Copy-Item -Path (Join-Path $coreSource "*") -Destination $coreInstall -Recurse -Force
}

if (-not (Test-Path $coreEntry)) {
    throw "❌ No se encontró el core universal: $coreEntry"
}

if ($Command -ne "capabilities" -and -not (Test-Path $adapterPath)) {
    throw "❌ No se encontró el adapter GitHub: $adapterPath"
}

& $coreEntry `
    -Command $Command `
    -Type $Type `
    -Agent $Agent `
    -Scope $Scope `
    -Json:$jsonRequested `
    -RepoRoot $repoRoot `
    -AdapterPath $adapterPath `
    -BackgroundChild:$BackgroundChild `
    -Foreground:$Foreground
exit $LASTEXITCODE
