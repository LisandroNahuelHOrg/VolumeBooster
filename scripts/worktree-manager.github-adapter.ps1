<#
.SYNOPSIS
    Universal Worktree Manager GitHub Adapter v1.0
    Motor de orquestación para desarrollo paralelo con worktrees aislados.

.DESCRIPTION
    Gestiona el ciclo de vida completo de worktrees Git para desarrollo multi-agente:
    create → work → ship → cleanup

    Cada agente obtiene un worktree aislado con su propia rama, node_modules,
    y dist/. La integración a la rama base se hace exclusivamente via CI-validated PRs.

.PARAMETER Command
    Comando a ejecutar:
    create, ship, list, cleanup, scope-check,
    fixed-open, fixed-ship, fixed-ship-all, fixed-list

.PARAMETER Type
    Tipo de commit convencional (create/ship) o monitor key (fixed-open/fixed-ship)

.PARAMETER Agent
    Identificador del agente: ag1, ag2, ag3, ag4

.PARAMETER Scope
    Scope del trabajo (feature): adblock, smartcache, popup, options, cdn, etc.

.PARAMETER Foreground
    Ejecuta en primer plano con salida en vivo. `ship`, `fixed-ship` y `fixed-ship-all`
    corren en foreground por defecto.

.EXAMPLE
    .\worktree-manager.ps1 create feat ag1 adblock
    .\worktree-manager.ps1 ship feat ag1 adblock
    .\ship-live.ps1 feat ag1 adblock
    .\worktree-manager.ps1 list
    .\worktree-manager.ps1 cleanup
    .\worktree-manager.ps1 scope-check adblock
#>

param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("create", "ship", "list", "cleanup", "scope-check", "fixed-open", "fixed-ship", "fixed-ship-all", "fixed-list", "help", "sanitize-main")]
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

# UTF-8 encoding enforcement (required by verify-powershell-utf8.mjs guard)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
. (Join-Path $PSScriptRoot "worktree-manager-core\lib\Clear-IgnorableMainLocalDirtyState.ps1")
. (Join-Path $PSScriptRoot "worktree-manager-core\lib\Ensure-RepoBuildToolingReady.ps1")
. (Join-Path $PSScriptRoot "worktree-manager-core\lib\Get-GitHubHeadRef.ps1")
. (Join-Path $PSScriptRoot "worktree-manager-core\lib\Invoke-VerifiedProductionBuild.ps1")
. (Join-Path $PSScriptRoot "worktree-manager-core\lib\Remove-DirectoryRobust.ps1")
. (Join-Path $PSScriptRoot "worktree-manager-core\lib\Test-AllowedMainLocalDirtyState.ps1")
. (Join-Path $PSScriptRoot "worktree-manager-core\lib\Test-RunPRequired.ps1")

function Invoke-HiddenSelf {
    param(
        [string]$EntryCommand,
        [string]$EntryType,
        [string]$EntryAgent,
        [string]$EntryScope
    )

    $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    $diagDir = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_DIAGNOSTICS_DIR)")) { Join-Path $repoRoot ".agent\0. Agents Brain\diagnostics\worktree-manager" } else { "$($env:WORKTREE_MANAGER_DIAGNOSTICS_DIR)" }
    New-Item -ItemType Directory -Force -Path $diagDir | Out-Null

    $runId = (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
    $stdoutLog = Join-Path $diagDir ("bg-" + $runId + ".stdout.log")
    $stderrLog = Join-Path $diagDir ("bg-" + $runId + ".stderr.log")

    $scriptPathLiteral = $PSCommandPath.Replace("'", "''")
    $cmdLiteral = $EntryCommand.Replace("'", "''")
    $payload = "& '$scriptPathLiteral' -Command '$cmdLiteral' -BackgroundChild"

    if (-not [string]::IsNullOrWhiteSpace($EntryType)) {
        $typeLiteral = $EntryType.Replace("'", "''")
        $payload += " -Type '$typeLiteral'"
    }
    if (-not [string]::IsNullOrWhiteSpace($EntryAgent)) {
        $agentLiteral = $EntryAgent.Replace("'", "''")
        $payload += " -Agent '$agentLiteral'"
    }
    if (-not [string]::IsNullOrWhiteSpace($EntryScope)) {
        $scopeLiteral = $EntryScope.Replace("'", "''")
        $payload += " -Scope '$scopeLiteral'"
    }

    $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($payload))
    $args = @(
        "-NoLogo",
        "-NoProfile",
        "-EncodedCommand", $encoded
    )

    $proc = Start-Process -FilePath "pwsh" `
        -ArgumentList $args `
        -WorkingDirectory (Get-Location).Path `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru `
        -Wait

    if (Test-Path $stdoutLog) {
        Get-Content -Path $stdoutLog -Encoding utf8
    }
    if ($proc.ExitCode -ne 0 -and (Test-Path $stderrLog)) {
        Get-Content -Path $stderrLog -Encoding utf8
    }

    exit $proc.ExitCode
}

if (-not $BackgroundChild -and -not $Foreground) {
    if ($Command -in @("ship", "fixed-ship", "fixed-ship-all")) {
        Write-Host "📡 Modo live forzado para '$Command': ejecución en primer plano."
        if ($Command -eq "ship") {
            Write-Host "📝 Recomendado: pwsh -File scripts/ship-live.ps1 <type> <agent> <scope>"
        }
    }
    else {
        Invoke-HiddenSelf -EntryCommand $Command -EntryType $Type -EntryAgent $Agent -EntryScope $Scope
    }
}


# ═══════════════════════════════════════════════════════════════
# FUNCTIONS
# ═══════════════════════════════════════════════════════════════
function Get-PreferredWorktreeRoot {
    $override = "$($env:WORKTREE_MANAGER_WORKTREE_ROOT)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($override)) {
        return $override
    }

    $defaultRoot = "D:\Local Worktrees"
    New-Item -ItemType Directory -Path $defaultRoot -Force | Out-Null
    return $defaultRoot
}

function Get-PreferredMainRepo {
    $override = "$($env:WORKTREE_MANAGER_REPO_ROOT)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($override) -and (Test-Path (Join-Path $override ".git"))) {
        return $override
    }

    $candidate = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    if (Test-Path (Join-Path $candidate ".git")) { return $candidate }
    throw "No se encontró un repositorio válido para worktree-manager. Revisar \$PSScriptRoot o rutas legacy."
}

# ═══════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════
$TreeRoot = Get-PreferredWorktreeRoot
$MainRepo = Get-PreferredMainRepo
$PrimaryRemote = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_PRIMARY_REMOTE)")) { "origin" } else { "$($env:WORKTREE_MANAGER_PRIMARY_REMOTE)".Trim() }
$BaseBranch = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_BASE_BRANCH)")) { "main" } else { "$($env:WORKTREE_MANAGER_BASE_BRANCH)".Trim() }
$BaseRef = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_BASE_REF)")) { "$PrimaryRemote/$BaseBranch" } else { "$($env:WORKTREE_MANAGER_BASE_REF)".Trim() }
$SpeedCacheRoot = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_CACHE_ROOT)")) { "D:\Local Worktrees\.manager-cache\default" } else { "$($env:WORKTREE_MANAGER_CACHE_ROOT)".Trim() }
$NpmCacheDir = Join-Path $SpeedCacheRoot "npm"
$TmpDir = Join-Path $SpeedCacheRoot "tmp"
$NpmGlobalDir = Join-Path $SpeedCacheRoot "npm-global"
$GitHubRepo = "$($env:WORKTREE_MANAGER_GITHUB_REPO)".Trim()
try {
    if ([string]::IsNullOrWhiteSpace($GitHubRepo)) {
        $remoteUrl = (& git -C $MainRepo config --get "remote.$PrimaryRemote.url" 2>$null).Trim()
        if ($remoteUrl -match '^https://github\.com/([^/]+)/([^/.]+)(?:\.git)?$') {
            $GitHubRepo = "$($matches[1])/$($matches[2])"
        }
        elseif ($remoteUrl -match '^git@github\.com:([^/]+)/([^/.]+)(?:\.git)?$') {
            $GitHubRepo = "$($matches[1])/$($matches[2])"
        }
    }
}
catch {
    # fallback a env si no se puede leer remote
}
$ScopeLockFile = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_SCOPE_LOCK_FILE)")) { Join-Path $MainRepo ".agent\worktree-scope-lock.json" } else { "$($env:WORKTREE_MANAGER_SCOPE_LOCK_FILE)" }
$MutexName = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_SCOPE_MUTEX_NAME)")) { "Global\WorktreeManagerScopeLock" } else { "$($env:WORKTREE_MANAGER_SCOPE_MUTEX_NAME)" }
$MutexTimeout = 15000  # 15 seconds
$ValidCommitTypes = @("feat", "fix", "chore", "refactor", "test", "docs", "perf", "ci")
$FixedMonitorMap = [ordered]@{
    "izq-arriba" = @{
        key        = "izq-arriba"
        display    = "WorktreeIzqArriba"
        path       = (Join-Path $TreeRoot "WorktreeIzqArriba")
        branch     = "monitor-izq-arriba"
        scope      = "monitor-izq-arriba"
        agent      = "fixed-monitor"
    }
    "der-arriba" = @{
        key        = "der-arriba"
        display    = "WorktreeDerArriba"
        path       = (Join-Path $TreeRoot "WorktreeDerArriba")
        branch     = "monitor-der-arriba"
        scope      = "monitor-der-arriba"
        agent      = "fixed-monitor"
    }
    "izq-abajo" = @{
        key        = "izq-abajo"
        display    = "WorktreeIzqAbajo"
        path       = (Join-Path $TreeRoot "WorktreeIzqAbajo")
        branch     = "monitor-izq-abajo"
        scope      = "monitor-izq-abajo"
        agent      = "fixed-monitor"
    }
    "der-abajo" = @{
        key        = "der-abajo"
        display    = "WorktreeDerAbajo"
        path       = (Join-Path $TreeRoot "WorktreeDerAbajo")
        branch     = "monitor-der-abajo"
        scope      = "monitor-der-abajo"
        agent      = "fixed-monitor"
    }
}
$FixedMonitorOrder = @("izq-arriba", "der-arriba", "izq-abajo", "der-abajo")
$WorktreeManagerDiagDir = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_DIAGNOSTICS_DIR)")) { Join-Path $MainRepo ".agent\0. Agents Brain\diagnostics\worktree-manager" } else { "$($env:WORKTREE_MANAGER_DIAGNOSTICS_DIR)" }
$FixedShipAllStateFile = Join-Path $WorktreeManagerDiagDir "fixed-ship-all-active.json"
$FixedShipAllMutexName = if ([string]::IsNullOrWhiteSpace("$($env:WORKTREE_MANAGER_FIXED_SHIP_ALL_MUTEX_NAME)")) { "Global\WorktreeManagerFixedShipAllLock" } else { "$($env:WORKTREE_MANAGER_FIXED_SHIP_ALL_MUTEX_NAME)" }
$FixedShipAllMutexTimeout = 10000
$FixedShipAllBaseRetrySeconds = 20
$FixedShipAllMaxRetrySeconds = 120
$FixedShipAllMaxAttemptsPerMonitor = 120
$ShipRouteLabelGh = "ci-route-gh"
$ShipRouteLabelSelf = "ci-route-self"
$DefaultCodexReviewBotLogins = @("chatgpt-codex-connector[bot]", "chatgpt-codex-connector")

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════
# WAIT FOR PR MERGE (espera que el auto-merge se complete)
# ═══════════════════════════════════════════════════════════════
function Wait-PRMerged {
    param(
        [string]$Branch,
        [int]$MaxWaitSeconds = 900   # 15 min — CI puede tardar
    )
    Write-Host "⏳ Esperando auto-merge del PR (branch: $Branch)..."
    Write-Host "   El PR se mergeará automáticamente cuando todos los CI checks pasen en verde."
    $deadline = (Get-Date).AddSeconds($MaxWaitSeconds)
    while ((Get-Date) -lt $deadline) {
        $prJson = gh pr view $Branch --json "number,url,state,mergedAt,mergeable,mergeCommit" 2>&1
        try {
            $pr = $prJson | ConvertFrom-Json
        }
        catch {
            Write-Host "   ⚠️ Error consultando estado del PR. Reintentando..."
            Start-Sleep -Seconds 15
            continue
        }
        if ($pr.state -eq "MERGED") {
            $mergeCommitSha = ""
            if ($pr.mergeCommit -and $pr.mergeCommit.oid) {
                $mergeCommitSha = "$($pr.mergeCommit.oid)"
            }
            $shortSha = if ($mergeCommitSha.Length -ge 8) { $mergeCommitSha.Substring(0, 8) } else { $mergeCommitSha }
            Write-Host "✅ PR #$($pr.number) mergeado exitosamente a main (commit: $shortSha)."
            return [pscustomobject]@{
                Merged         = $true
                PrNumber       = $pr.number
                PrUrl          = $pr.url
                MergeCommitSha = $mergeCommitSha
                State          = $pr.state
            }
        }
        if ($pr.state -eq "CLOSED") {
            Write-Host "❌ PR cerrado sin mergear. Revisar manualmente."
            return [pscustomobject]@{
                Merged         = $false
                PrNumber       = $pr.number
                PrUrl          = $pr.url
                MergeCommitSha = ""
                State          = $pr.state
            }
        }
        Write-Host "   PR estado: $($pr.state) — esperando merge automático..."
        Start-Sleep -Seconds 20
    }
    Write-Host "⏰ Timeout ($MaxWaitSeconds s): el PR no se mergeó en tiempo. Verificar CI manualmente."
    return [pscustomobject]@{
        Merged         = $false
        PrNumber       = $null
        PrUrl          = $null
        MergeCommitSha = ""
        State          = "TIMEOUT"
    }
}

# ═══════════════════════════════════════════════════════════════
# REMOTE BRANCH CLEANUP (strict, idempotent)
# ═══════════════════════════════════════════════════════════════
function Ensure-RemoteBranchDeleted {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$BranchName,
        [string]$ContextLabel = "ship",
        [int]$MaxAttempts = 4,
        [int]$RetryDelaySeconds = 4
    )

    Push-Location $RepoPath
    try {
        for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
            git fetch origin --prune 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "⚠️ No se pudo hacer fetch --prune durante cleanup remoto ($ContextLabel), intento $attempt/$MaxAttempts."
            }

            $remoteHead = (git ls-remote --heads origin $BranchName 2>$null | Out-String).Trim()
            if ($LASTEXITCODE -eq 0 -and [string]::IsNullOrWhiteSpace($remoteHead)) {
                Write-Host "✅ Rama remota '$BranchName' ausente ($ContextLabel)."
                return
            }

            Write-Host "🧹 Eliminando rama remota '$BranchName' ($ContextLabel), intento $attempt/$MaxAttempts..."
            $deleteOutput = (git push origin --delete $BranchName 2>&1 | Out-String).Trim()
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Rama remota '$BranchName' eliminada."
                git fetch origin --prune 2>&1 | Out-Null
                $remoteHeadAfterDelete = (git ls-remote --heads origin $BranchName 2>$null | Out-String).Trim()
                if ($LASTEXITCODE -eq 0 -and [string]::IsNullOrWhiteSpace($remoteHeadAfterDelete)) {
                    Write-Host "✅ Eliminación remota confirmada para '$BranchName'."
                    return
                }
                Write-Warning "⚠️ GitHub aún reporta '$BranchName' después del delete. Reintentando validación..."
            }
            elseif ($deleteOutput -match "remote ref does not exist|not found|unable to delete '.+': remote ref does not exist") {
                Write-Host "ℹ️ Rama remota '$BranchName' ya no existe."
                return
            }
            else {
                Write-Warning "⚠️ Falló delete remoto '$BranchName' ($ContextLabel): $deleteOutput"
            }

            if ($attempt -lt $MaxAttempts) {
                Start-Sleep -Seconds $RetryDelaySeconds
            }
        }
    }
    finally {
        Pop-Location
    }

    throw "❌ No se pudo confirmar eliminación de rama remota '$BranchName' tras $MaxAttempts intentos ($ContextLabel)."
}

# ═══════════════════════════════════════════════════════════════
# WAIT FOR MAIN CI (espera CI 100% verde antes de limpiar)
# ═══════════════════════════════════════════════════════════════
function Wait-MainCIForCommit {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommitSha,
        [int]$PrNumber = 0,
        [int]$MaxWaitSeconds = 600
    )

    $commitShort = if ($CommitSha.Length -ge 8) { $CommitSha.Substring(0, 8) } else { $CommitSha }
    $prLabel = if ($PrNumber -gt 0) { "#$PrNumber" } else { "(sin PR)" }

    Write-Host "⏳ Esperando CI de '$BaseBranch' para commit $commitShort (PR $prLabel)..."
    Start-Sleep -Seconds 10
    $deadline = (Get-Date).AddSeconds($MaxWaitSeconds)

    while ((Get-Date) -lt $deadline) {
        $runsJson = gh api "repos/$GitHubRepo/actions/workflows/verify.yml/runs?branch=$BaseBranch&per_page=20" 2>&1
        try {
            $runs = $runsJson | ConvertFrom-Json
        }
        catch {
            Write-Host "   ⚠️ Error parseando respuesta de GitHub Actions. Reintentando..."
            Start-Sleep -Seconds 20
            continue
        }

        $candidates = @($runs.workflow_runs | Where-Object { $_.head_sha -eq $CommitSha })
        if (-not $candidates -or $candidates.Count -eq 0) {
            Write-Host "   ⏳ Aún no aparece run verify.yml para commit $commitShort."
            Start-Sleep -Seconds 20
            continue
        }

        $targetRun = $candidates | Sort-Object created_at -Descending | Select-Object -First 1
        $status = $targetRun.status
        $conclusion = $targetRun.conclusion
        Write-Host "   CI $BaseBranch[$($targetRun.id)] commit=${commitShort}: status=$status conclusion=$(if($conclusion){$conclusion}else{'(pendiente)'})"

        if ($status -eq "completed") {
            if ($conclusion -eq "success") {
                Write-Host "✅ CI $BaseBranch del commit ${commitShort}: PASS. Procediendo a limpieza física del worktree."
                return $true
            }

            Write-Host "❌ CI $BaseBranch del commit ${commitShort}: FALLÓ ($conclusion). NO se eliminará el directorio local."
            return $false
        }

        Start-Sleep -Seconds 20
    }

    Write-Host "⏰ Timeout ($MaxWaitSeconds s) esperando CI $BaseBranch para commit $commitShort. Directorio local conservado."
    return $false
}

# ═══════════════════════════════════════════════════════════════
# WAIT FOR MAIN CI (legacy, usado por cleanup global)
# ═══════════════════════════════════════════════════════════════
function Wait-MainCI {
    param([int]$MaxWaitSeconds = 600)
    Write-Host "⏳ Esperando CI de '$BaseBranch' (100%% verde) antes de limpiar..."
    # Buffer inicial: GitHub tarda ~15s en registrar el merge como nuevo run
    Start-Sleep -Seconds 15
    $deadline = (Get-Date).AddSeconds($MaxWaitSeconds)
    while ((Get-Date) -lt $deadline) {
        $runsJson = gh api "repos/$GitHubRepo/actions/workflows/verify.yml/runs?branch=$BaseBranch&per_page=1" 2>&1
        try {
            $runs = $runsJson | ConvertFrom-Json
        }
        catch {
            Write-Host "   ⚠️ Error parseando respuesta de GitHub Actions. Reintentando..."
            Start-Sleep -Seconds 20
            continue
        }
        $latest = $runs.workflow_runs | Select-Object -First 1
        if (-not $latest) {
            Write-Host "   ⚠️ Sin runs en '$BaseBranch' aún. Reintentando..."
            Start-Sleep -Seconds 20
            continue
        }
        $status = $latest.status
        $conclusion = $latest.conclusion
        Write-Host "   CI $BaseBranch[$($latest.id)]: status=$status conclusion=$(if($conclusion){$conclusion}else{'(pendiente)'})"
        if ($status -eq "completed") {
            if ($conclusion -eq "success") {
            Write-Host "✅ CI ${BaseBranch}: PASS. Procediendo a limpieza física del worktree."
                return $true
            }
            else {
            Write-Host "❌ CI ${BaseBranch}: FALLÓ ($conclusion). NO se eliminará el directorio local."
                return $false
            }
        }
        # CI aún en progreso — esperar
        Start-Sleep -Seconds 20
    }
    Write-Host "⏰ Timeout ($MaxWaitSeconds s) esperando CI $BaseBranch. Directorio local conservado."
    return $false
}

# ═══════════════════════════════════════════════════════════════
# ATOMIC LOCK (OS Mutex)
# ═══════════════════════════════════════════════════════════════
function Use-AtomicLock {
    param([scriptblock]$Action)
    $mutex = New-Object System.Threading.Mutex($false, $MutexName)
    try {
        if (-not $mutex.WaitOne($MutexTimeout)) {
            throw "⏰ Timeout ($($MutexTimeout / 1000)s): Scope lock ocupado por otro agente."
        }
        & $Action
    }
    finally {
        try { $mutex.ReleaseMutex() } catch {}
        $mutex.Dispose()
    }
}

function Ensure-WorktreeManagerDiagnosticsDir {
    if (-not (Test-Path $WorktreeManagerDiagDir)) {
        New-Item -ItemType Directory -Path $WorktreeManagerDiagDir -Force | Out-Null
    }
}

function Use-FixedShipAllAtomicLock {
    param([scriptblock]$Action)
    $mutex = New-Object System.Threading.Mutex($false, $FixedShipAllMutexName)
    try {
        if (-not $mutex.WaitOne($FixedShipAllMutexTimeout)) {
            throw "⏰ Timeout ($($FixedShipAllMutexTimeout / 1000)s): lock global de fixed-ship-all ocupado."
        }
        & $Action
    }
    finally {
        try { $mutex.ReleaseMutex() } catch {}
        $mutex.Dispose()
    }
}

function Test-ProcessAlive {
    param([int]$ProcessId)

    if ($ProcessId -le 0) {
        return $false
    }

    try {
        $null = Get-Process -Id $ProcessId -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Get-ProcessCommandLine {
    param([int]$ProcessId)

    if ($ProcessId -le 0) {
        return ""
    }

    try {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
        return "$($proc.CommandLine)"
    }
    catch {
        return ""
    }
}

function Enter-FixedShipAllSession {
    Ensure-WorktreeManagerDiagnosticsDir

    Use-FixedShipAllAtomicLock {
        $currentLogPath = if ($env:SPEEDSUITE_FIXED_SHIP_ALL_LOG_PATH) { "$($env:SPEEDSUITE_FIXED_SHIP_ALL_LOG_PATH)" } else { $null }

        if (Test-Path $FixedShipAllStateFile) {
            try {
                $state = Get-Content -Path $FixedShipAllStateFile -Raw -Encoding utf8 | ConvertFrom-Json
                $existingPid = 0
                [void][int]::TryParse("$($state.pid)", [ref]$existingPid)
                if ($existingPid -gt 0 -and $existingPid -ne $PID -and (Test-ProcessAlive -ProcessId $existingPid)) {
                    $cmd = Get-ProcessCommandLine -ProcessId $existingPid
                    $logHint = if ($state.logPath) { "$($state.logPath)" } else { "(sin log registrado)" }
                    throw "❌ Ya hay un fixed-ship-all activo (pid=$existingPid). Log sugerido: $logHint. CommandLine: $cmd"
                }
            }
            catch {
                if ($_.Exception.Message -like "❌ Ya hay un fixed-ship-all activo*") {
                    throw
                }
            }

            Remove-Item -Path $FixedShipAllStateFile -Force -ErrorAction SilentlyContinue
        }

        $newState = [pscustomobject]@{
            pid       = $PID
            startedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            command   = "fixed-ship-all"
            cwd       = (Get-Location).Path
            logPath   = $currentLogPath
        }

        $newState | ConvertTo-Json -Depth 5 | Set-Content -Path $FixedShipAllStateFile -Encoding utf8
    }
}

function Exit-FixedShipAllSession {
    Use-FixedShipAllAtomicLock {
        if (-not (Test-Path $FixedShipAllStateFile)) {
            return
        }

        try {
            $state = Get-Content -Path $FixedShipAllStateFile -Raw -Encoding utf8 | ConvertFrom-Json
            $existingPid = 0
            [void][int]::TryParse("$($state.pid)", [ref]$existingPid)
            if ($existingPid -eq $PID -or -not (Test-ProcessAlive -ProcessId $existingPid)) {
                Remove-Item -Path $FixedShipAllStateFile -Force -ErrorAction SilentlyContinue
            }
        }
        catch {
            Remove-Item -Path $FixedShipAllStateFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# ═══════════════════════════════════════════════════════════════
# SCOPE LOCK HELPERS
# ═══════════════════════════════════════════════════════════════
function Ensure-ScopeLockDirectory {
    $scopeLockDir = Split-Path -Parent $ScopeLockFile
    if (-not [string]::IsNullOrWhiteSpace($scopeLockDir) -and -not (Test-Path $scopeLockDir)) {
        New-Item -ItemType Directory -Path $scopeLockDir -Force | Out-Null
    }
}

function Test-LocalBranchExists {
    param([string]$BranchName)

    if ([string]::IsNullOrWhiteSpace($BranchName)) {
        return $false
    }

    git -C $MainRepo show-ref --verify --quiet "refs/heads/$BranchName" 2>$null
    return $LASTEXITCODE -eq 0
}

function Test-RemoteBranchExists {
    param([string]$BranchName)

    if ([string]::IsNullOrWhiteSpace($BranchName)) {
        return $false
    }

    $remoteHead = (git -C $MainRepo ls-remote --heads origin $BranchName 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        return $true
    }

    return -not [string]::IsNullOrWhiteSpace($remoteHead)
}

function Resolve-LockPathCandidate {
    param([string]$PathValue)

    if (-not $PathValue) { return "" }

    $candidate = "$PathValue".Trim()
    try {
        $candidate = [System.IO.Path]::GetFullPath($candidate)
    }
    catch {}

    return $candidate
}

function Normalize-ScopeLockData {
    param($Data)

    $locks = @()
    if ($Data -and $Data.PSObject.Properties["locks"]) {
        $locks = @($Data.locks | Where-Object { $null -ne $_ })
    }

    return [pscustomobject]@{
        locks = $locks
    }
}

function Test-StaleScopeLock {
    param($LockEntry)

    if ($null -eq $LockEntry) {
        return $true
    }

    $lockPath = Resolve-LockPathCandidate "$($LockEntry.path)"
    if ([string]::IsNullOrWhiteSpace($lockPath) -or -not (Test-Path $lockPath)) {
        return $true
    }

    $agent = "$($LockEntry.agent)"
    $scope = "$($LockEntry.scope)"
    if ($agent -eq "main-rescue" -or $scope -eq "main-rescue") {
        $branch = "$($LockEntry.branch)".Trim()
        if ([string]::IsNullOrWhiteSpace($branch)) {
            return $true
        }

        if (-not (Test-LocalBranchExists -BranchName $branch) -and -not (Test-RemoteBranchExists -BranchName $branch)) {
            return $true
        }
    }

    return $false
}

function Read-ScopeLock {
    Ensure-ScopeLockDirectory
    if (-not (Test-Path $ScopeLockFile)) {
        @{ locks = @() } | ConvertTo-Json -Depth 5 | Set-Content $ScopeLockFile -Encoding utf8
    }
    $maxAttempts = 3
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            $lockData = Normalize-ScopeLockData (Get-Content $ScopeLockFile -Raw -Encoding utf8 | ConvertFrom-Json)
            $activeLocks = @()
            $removedCount = 0

            foreach ($lock in $lockData.locks) {
                if (Test-StaleScopeLock -LockEntry $lock) {
                    $removedCount += 1
                    continue
                }

                $activeLocks += $lock
            }

            if ($removedCount -gt 0) {
                $lockData = [pscustomobject]@{ locks = $activeLocks }
                Save-ScopeLock $lockData
                Write-Host "🧹 Scope lock limpio: $removedCount entrada(s) obsoleta(s) descartada(s)."
            }

            return $lockData
        }
        catch {
            if ($attempt -eq $maxAttempts) {
                throw "❌ No se pudo leer $ScopeLockFile (JSON inválido tras $maxAttempts intentos). Error: $_"
            }
            Start-Sleep -Milliseconds (75 * $attempt)
        }
    }
}

function Save-ScopeLock {
    param($Data)
    Ensure-ScopeLockDirectory
    $tmpPath = "$ScopeLockFile.tmp"
    (Normalize-ScopeLockData $Data) | ConvertTo-Json -Depth 5 | Set-Content $tmpPath -Encoding utf8
    Move-Item -Path $tmpPath -Destination $ScopeLockFile -Force
}

function Get-BranchName {
    param($T, $A, $S)
    return "$T-$A-$S"
}

function Normalize-FixedMonitorKey {
    param([string]$RawKey)

    if (-not $RawKey) { return "" }
    $k = $RawKey.Trim().ToLowerInvariant()
    $k = $k.Replace("/", "").Replace("\", "").Replace("_", "-").Replace(" ", "")

    switch ($k) {
        "izq-arriba" { return "izq-arriba" }
        "izqarriba" { return "izq-arriba" }
        "worktreeizqarriba" { return "izq-arriba" }
        "worktrenizqarriba" { return "izq-arriba" }

        "der-arriba" { return "der-arriba" }
        "derarriba" { return "der-arriba" }
        "worktreederarriba" { return "der-arriba" }

        "izq-abajo" { return "izq-abajo" }
        "izqabajo" { return "izq-abajo" }
        "worktreeizqabajo" { return "izq-abajo" }

        "der-abajo" { return "der-abajo" }
        "derabajo" { return "der-abajo" }
        "worktreederabajo" { return "der-abajo" }

        default { return $k }
    }
}

function Get-FixedMonitorConfig {
    param([string]$RawKey)

    $key = Normalize-FixedMonitorKey -RawKey $RawKey
    if (-not $FixedMonitorMap.Contains($key)) {
        $available = ($FixedMonitorMap.Keys -join ", ")
        throw "❌ Monitor inválido '$RawKey'. Opciones: $available"
    }

    $cfg = $FixedMonitorMap[$key]
    return [pscustomobject]@{
        key     = $cfg.key
        display = $cfg.display
        path    = $cfg.path
        branch  = $cfg.branch
        scope   = $cfg.scope
        agent   = $cfg.agent
    }
}

function Get-LintPluginEntryPath {
    param([string]$RepoPath)
    return (Join-Path $RepoPath "eslint-plugin-speedsuite\dist\index.js")
}

function Ensure-LintPluginDistReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorktreePath,
        [string]$ContextLabel = "worktree"
    )

    $pluginEntry = Get-LintPluginEntryPath -RepoPath $WorktreePath
    if (Test-Path $pluginEntry) {
        return
    }

    Write-Warning "⚠️ Faltaba eslint-plugin-speedsuite/dist para '$ContextLabel'. Intentando auto-reparar..."

    Ensure-WorktreeDependenciesReady -WorktreePath $WorktreePath -ContextLabel "$ContextLabel/deps"

    $packageJson = Join-Path $WorktreePath "package.json"
    $hasBuildLintPluginScript = $false
    if (Test-Path $packageJson) {
        try {
            $pkg = Get-Content -Raw -Path $packageJson | ConvertFrom-Json -ErrorAction Stop
            if ($pkg.scripts -and $pkg.scripts.PSObject.Properties["build:lint-plugin"]) {
                $hasBuildLintPluginScript = $true
            }
        }
        catch {
            # Si package.json no parsea, se intenta continuar con estrategias de copia/fallback.
        }
    }

    $buildSucceeded = $false
    Push-Location $WorktreePath
    try {
        if ($hasBuildLintPluginScript) {
            Use-SpeedSuiteCacheEnv {
                npm run build:lint-plugin 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $buildSucceeded = $true
                }
            }
        }
        else {
            Write-Warning "⚠️ En este repositorio no existe script 'build:lint-plugin'. Se omite reconstrucción de eslint-plugin-speedsuite para '$ContextLabel'."
        }
    }
    finally {
        Pop-Location
    }

    if (Test-Path $pluginEntry) {
        $status = if ($buildSucceeded) { "✅" } else { "⚠️" }
        Write-Host "$status eslint-plugin-speedsuite/dist preparado para '$ContextLabel'."
        return
    }

    if (-not $buildSucceeded -and -not $hasBuildLintPluginScript) {
        Write-Host "⚠️  Omitiendo fallback de eslint-plugin-speedsuite/dist en '$ContextLabel' porque no aplica en este proyecto."
        return
    }

    $candidateRoots = [System.Collections.Generic.List[string]]::new()
    $candidateRoots.Add($MainRepo) | Out-Null
    foreach ($monitorCfg in $FixedMonitorMap.Values) {
        $candidateRoots.Add("$($monitorCfg.path)") | Out-Null
    }

    foreach ($candidateRoot in ($candidateRoots | Select-Object -Unique)) {
        if (-not $candidateRoot) { continue }
        if ($candidateRoot -eq $WorktreePath) { continue }

        $candidateEntry = Get-LintPluginEntryPath -RepoPath $candidateRoot
        if (-not (Test-Path $candidateEntry)) {
            continue
        }

        $sourceDistDir = Split-Path -Parent $candidateEntry
        $targetDistDir = Split-Path -Parent $pluginEntry
        New-Item -ItemType Directory -Path $targetDistDir -Force | Out-Null

        $null = robocopy $sourceDistDir $targetDistDir /MIR /COPY:DAT /DCOPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
        $copyExit = $LASTEXITCODE

        if ($copyExit -lt 8 -and (Test-Path $pluginEntry)) {
            Write-Host "✅ eslint-plugin-speedsuite/dist sembrado desde '$candidateRoot' para '$ContextLabel'."
            return
        }
    }

    throw "❌ No se pudo preparar eslint-plugin-speedsuite/dist en '$WorktreePath' para '$ContextLabel'."
}

function Update-RemoteBranchLeaseInfo {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$BranchName,
        [string]$ContextLabel = "ship"
    )

    $fetchOutput = git -C $RepoPath fetch origin $BranchName 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        return
    }

    if (
        $fetchOutput -match "couldn't find remote ref" -or
        $fetchOutput -match "no such ref was fetched"
    ) {
        Write-Host "ℹ️ Rama remota '$BranchName' inexistente durante '$ContextLabel'. Continuando con primer push."
        return
    }

    throw "❌ Fetch de rama remota '$BranchName' falló durante '$ContextLabel'. Detalle: $fetchOutput"
}

function Get-ShipRouteOverride {
    $raw = "$($env:SPEEDSUITE_SHIP_FORCE_ROUTE)".Trim().ToLowerInvariant()
    switch ($raw) {
        "gh" { return "gh" }
        "self" { return "self" }
        "auto" { return "auto" }
        "" { return "auto" }
        default {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_FORCE_ROUTE='$raw' inválido. Usando auto."
            return "auto"
        }
    }
}

function Ensure-PRRouteLabelExists {
    param([Parameter(Mandatory = $true)][string]$LabelName)

    gh label create $LabelName --color "1d76db" --description "Force verify route: $LabelName" 2>$null | Out-Null
}

function Set-PRShipRouteLabel {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PrNumber,
        [Parameter(Mandatory = $true)]
        [ValidateSet("gh", "self")]
        [string]$Route,
        [string]$ContextLabel = "ship"
    )

    if ($PrNumber -le 0) {
        throw "❌ PR number inválido para setear route label."
    }

    Ensure-PRRouteLabelExists -LabelName $ShipRouteLabelGh
    Ensure-PRRouteLabelExists -LabelName $ShipRouteLabelSelf

    $desiredLabel = if ($Route -eq "gh") { $ShipRouteLabelGh } else { $ShipRouteLabelSelf }
    $otherLabel = if ($Route -eq "gh") { $ShipRouteLabelSelf } else { $ShipRouteLabelGh }

    gh pr edit $PrNumber --add-label $desiredLabel 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "❌ No se pudo aplicar label '$desiredLabel' al PR #$PrNumber ($ContextLabel)."
    }

    gh pr edit $PrNumber --remove-label $otherLabel 2>$null | Out-Null
    Write-Host "🏷️ Route label aplicado en PR #${PrNumber}: $desiredLabel"
}

function Clear-PRShipRouteLabels {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PrNumber,
        [string]$ContextLabel = "ship"
    )

    if ($PrNumber -le 0) {
        return
    }

    gh pr edit $PrNumber --remove-label $ShipRouteLabelGh 2>$null | Out-Null
    gh pr edit $PrNumber --remove-label $ShipRouteLabelSelf 2>$null | Out-Null
    Write-Host "🏷️ Route labels limpiados en PR #${PrNumber} ($ContextLabel): modo auto (self -> gh fallback)"
}

function Get-ShipCiResumeConfig {
    $enabled = $true
    $enabledRaw = "$($env:SPEEDSUITE_SHIP_CI_RESUME)".Trim().ToLowerInvariant()
    switch ($enabledRaw) {
        "" {}
        "on" {}
        "true" {}
        "1" {}
        "yes" {}
        "off" { $enabled = $false }
        "false" { $enabled = $false }
        "0" { $enabled = $false }
        "no" { $enabled = $false }
        default {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_CI_RESUME='$enabledRaw' inválido. Usando 'on'."
        }
    }

    $maxReruns = 2
    $maxRerunsRaw = "$($env:SPEEDSUITE_SHIP_CI_RESUME_MAX_RERUNS)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($maxRerunsRaw)) {
        $parsed = 0
        if ([int]::TryParse($maxRerunsRaw, [ref]$parsed) -and $parsed -ge 0 -and $parsed -le 6) {
            $maxReruns = $parsed
        }
        else {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_CI_RESUME_MAX_RERUNS='$maxRerunsRaw' inválido. Usando $maxReruns."
        }
    }

    $pollSeconds = 20
    $pollRaw = "$($env:SPEEDSUITE_SHIP_CI_RESUME_POLL_SECONDS)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($pollRaw)) {
        $parsedPoll = 0
        if ([int]::TryParse($pollRaw, [ref]$parsedPoll) -and $parsedPoll -ge 5 -and $parsedPoll -le 120) {
            $pollSeconds = $parsedPoll
        }
        else {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_CI_RESUME_POLL_SECONDS='$pollRaw' inválido. Usando $pollSeconds."
        }
    }

    $failMode = "open"
    $failModeRaw = "$($env:SPEEDSUITE_SHIP_CI_RESUME_FAIL_MODE)".Trim().ToLowerInvariant()
    switch ($failModeRaw) {
        "" {}
        "open" {}
        "closed" { $failMode = "closed" }
        default {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_CI_RESUME_FAIL_MODE='$failModeRaw' inválido. Usando '$failMode'."
        }
    }

    $targetChecksRaw = "$($env:SPEEDSUITE_SHIP_CI_RESUME_TARGET_CHECKS)".Trim()
    $targetChecks = @()
    if (-not [string]::IsNullOrWhiteSpace($targetChecksRaw)) {
        $targetChecks = @(
            $targetChecksRaw -split "[,;]+" |
                ForEach-Object { "$_".Trim() } |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
                Select-Object -Unique
        )
    }

    if (-not $targetChecks -or $targetChecks.Count -eq 0) {
        $targetChecks = @("verify", "✅ CI Gate")
    }

    return [pscustomobject]@{
        Enabled      = $enabled
        MaxReruns    = $maxReruns
        PollSeconds  = $pollSeconds
        FailMode     = $failMode
        TargetChecks = $targetChecks
    }
}

function Get-RunIdFromCheckLink {
    param([string]$Link)

    if ([string]::IsNullOrWhiteSpace($Link)) {
        return ""
    }

    $match = [regex]::Match("$Link", "actions\/runs\/(\d+)")
    if ($match.Success) {
        return "$($match.Groups[1].Value)"
    }

    return ""
}

function Test-IsShipCiResumeTargetCheck {
    param(
        $Check,
        [string[]]$TargetChecks = @()
    )

    if (-not $Check) {
        return $false
    }

    if (-not $TargetChecks -or $TargetChecks.Count -eq 0) {
        return $true
    }

    $name = "$($Check.name)".Trim().ToLowerInvariant()
    $workflow = "$($Check.workflow)".Trim().ToLowerInvariant()

    foreach ($target in $TargetChecks) {
        $needle = "$target".Trim().ToLowerInvariant()
        if ([string]::IsNullOrWhiteSpace($needle)) {
            continue
        }
        if ($name -eq $needle -or $workflow -eq $needle) {
            return $true
        }
    }

    return $false
}

function Get-GitHubRunForResume {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $raw = (gh run view $RunId --repo $GitHubRepo --json "databaseId,status,conclusion,runAttempt,url,workflowName,name" 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) {
        return [pscustomobject]@{
            Success = $false
            Error   = "$($raw.Trim())"
            Run     = $null
        }
    }

    try {
        $obj = $raw | ConvertFrom-Json
        return [pscustomobject]@{
            Success = $true
            Error   = ""
            Run     = $obj
        }
    }
    catch {
        return [pscustomobject]@{
            Success = $false
            Error   = "No se pudo parsear run view para run_id=${RunId}: $_"
            Run     = $null
        }
    }
}

function Invoke-GitHubRunRerunFailedJobs {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $endpoint = "repos/$GitHubRepo/actions/runs/$RunId/rerun-failed-jobs"
    $raw = (gh api -X POST $endpoint 2>&1 | Out-String)
    if ($LASTEXITCODE -eq 0) {
        return [pscustomobject]@{
            Success    = $true
            HttpStatus = 200
            Output     = "$($raw.Trim())"
        }
    }

    $status = 0
    $httpMatch = [regex]::Match("$raw", "\(HTTP\s+(\d{3})\)")
    if ($httpMatch.Success) {
        [void][int]::TryParse("$($httpMatch.Groups[1].Value)", [ref]$status)
    }

    return [pscustomobject]@{
        Success    = $false
        HttpStatus = $status
        Output     = "$($raw.Trim())"
    }
}

function Get-CodexReviewGateConfig {
    $enabled = $true
    $enabledRaw = "$($env:SPEEDSUITE_SHIP_REVIEW_GATE)".Trim().ToLowerInvariant()
    switch ($enabledRaw) {
        "" {}
        "on" {}
        "true" {}
        "1" {}
        "yes" {}
        "off" { $enabled = $false }
        "false" { $enabled = $false }
        "0" { $enabled = $false }
        "no" { $enabled = $false }
        default {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_REVIEW_GATE='$enabledRaw' inválido. Usando 'on'."
        }
    }

    $waitSeconds = 120
    $waitRaw = "$($env:SPEEDSUITE_SHIP_REVIEW_GATE_WAIT_SECONDS)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($waitRaw)) {
        $parsedWait = 0
        if ([int]::TryParse($waitRaw, [ref]$parsedWait) -and $parsedWait -ge 0 -and $parsedWait -le 900) {
            $waitSeconds = $parsedWait
        }
        else {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_REVIEW_GATE_WAIT_SECONDS='$waitRaw' inválido. Usando $waitSeconds."
        }
    }

    $pollSeconds = 10
    $pollRaw = "$($env:SPEEDSUITE_SHIP_REVIEW_GATE_POLL_SECONDS)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($pollRaw)) {
        $parsedPoll = 0
        if ([int]::TryParse($pollRaw, [ref]$parsedPoll) -and $parsedPoll -ge 1 -and $parsedPoll -le 120) {
            $pollSeconds = $parsedPoll
        }
        else {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_REVIEW_GATE_POLL_SECONDS='$pollRaw' inválido. Usando $pollSeconds."
        }
    }
    if ($waitSeconds -gt 0 -and $pollSeconds -gt $waitSeconds) {
        $pollSeconds = $waitSeconds
    }

    $blockMax = 2
    $blockRaw = "$($env:SPEEDSUITE_SHIP_REVIEW_GATE_BLOCK_MAX)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($blockRaw)) {
        $parsedBlock = 0
        if ([int]::TryParse($blockRaw, [ref]$parsedBlock) -and $parsedBlock -ge 0 -and $parsedBlock -le 3) {
            $blockMax = $parsedBlock
        }
        else {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_REVIEW_GATE_BLOCK_MAX='$blockRaw' inválido. Usando $blockMax."
        }
    }

    $failMode = "open"
    $failModeRaw = "$($env:SPEEDSUITE_SHIP_REVIEW_GATE_FAIL_MODE)".Trim().ToLowerInvariant()
    switch ($failModeRaw) {
        "" {}
        "open" {}
        "closed" { $failMode = "closed" }
        default {
            Write-Warning "⚠️ SPEEDSUITE_SHIP_REVIEW_GATE_FAIL_MODE='$failModeRaw' inválido. Usando '$failMode'."
        }
    }

    $botLogins = @()
    $botLoginsRaw = "$($env:SPEEDSUITE_SHIP_REVIEW_GATE_BOT_LOGINS)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($botLoginsRaw)) {
        $botLogins = @(
            $botLoginsRaw -split "[,\s;]+" |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
                ForEach-Object { "$($_)".Trim() } |
                Select-Object -Unique
        )
    }
    if (-not $botLogins -or $botLogins.Count -eq 0) {
        $botLogins = @($DefaultCodexReviewBotLogins)
    }

    return [pscustomobject]@{
        Enabled     = $enabled
        WaitSeconds = $waitSeconds
        PollSeconds = $pollSeconds
        BlockMax    = $blockMax
        FailMode    = $failMode
        BotLogins   = $botLogins
    }
}

function Invoke-GhApiWithRetry {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Endpoint,
        [int]$MaxAttempts = 3,
        [int]$RetryDelaySeconds = 3,
        [string]$ContextLabel = "gh-api"
    )

    if ($MaxAttempts -lt 1) { $MaxAttempts = 1 }
    if ($RetryDelaySeconds -lt 1) { $RetryDelaySeconds = 1 }

    $lastOutput = ""
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        $raw = (gh api $Endpoint 2>&1 | Out-String)
        if ($LASTEXITCODE -eq 0) {
            return [pscustomobject]@{
                Success  = $true
                Output   = "$raw"
                Attempt  = $attempt
                Endpoint = $Endpoint
                Error    = ""
            }
        }

        $lastOutput = "$raw".Trim()
        if ($attempt -lt $MaxAttempts) {
            Write-Warning "⚠️ gh api fallo (intento $attempt/$MaxAttempts, $ContextLabel): $Endpoint"
            Start-Sleep -Seconds $RetryDelaySeconds
        }
    }

    return [pscustomobject]@{
        Success  = $false
        Output   = $lastOutput
        Attempt  = $MaxAttempts
        Endpoint = $Endpoint
        Error    = $lastOutput
    }
}

function Test-IsCodexBotAuthor {
    param(
        [string]$Login,
        [string[]]$AllowedLogins = @()
    )

    if ([string]::IsNullOrWhiteSpace($Login)) {
        return $false
    }

    $normalizedLogin = "$Login".Trim().ToLowerInvariant()
    $normalizedAllow = @(
        $AllowedLogins |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
            ForEach-Object { "$($_)".Trim().ToLowerInvariant() }
    )
    if (-not $normalizedAllow -or $normalizedAllow.Count -eq 0) {
        $normalizedAllow = @($DefaultCodexReviewBotLogins | ForEach-Object { "$_".ToLowerInvariant() })
    }

    if ($normalizedAllow -contains $normalizedLogin) {
        return $true
    }

    $normalizedWithoutBot = $normalizedLogin -replace "\[bot\]$", ""
    foreach ($allow in $normalizedAllow) {
        $allowWithoutBot = "$allow" -replace "\[bot\]$", ""
        if ($allowWithoutBot -eq $normalizedWithoutBot) {
            return $true
        }
    }

    return $false
}

function Get-CodexSeverityFromBody {
    param([string]$Body)

    if ([string]::IsNullOrWhiteSpace($Body)) {
        return 3
    }

    $match = [regex]::Match($Body, "(?im)\bP([0-3])\b")
    if ($match.Success) {
        $level = 3
        if ([int]::TryParse("$($match.Groups[1].Value)", [ref]$level)) {
            return $level
        }
    }

    return 3
}

function Get-CodexReviewShortMessage {
    param(
        [string]$Body,
        [int]$MaxLength = 180
    )

    if ([string]::IsNullOrWhiteSpace($Body)) {
        return "(sin detalle)"
    }

    $line = @(
        $Body -split "\r?\n" |
            ForEach-Object { "$_".Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    ) | Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($line)) {
        $line = "$Body".Trim()
    }

    $line = $line -replace "<[^>]+>", ""
    $line = $line -replace "!\[[^\]]*\]\([^)]+\)", ""
    $line = $line -replace "\[([^\]]+)\]\([^)]+\)", '$1'
    $line = $line -replace "[*_`>#]", ""
    $line = $line -replace "^\s*P[0-3]\s+Badge\s*", ""
    $line = [regex]::Replace($line, "\s+", " ").Trim()

    if ([string]::IsNullOrWhiteSpace($line)) {
        return "(sin detalle)"
    }

    if ($MaxLength -gt 20 -and $line.Length -gt $MaxLength) {
        return ($line.Substring(0, $MaxLength - 3) + "...")
    }

    return $line
}

function Test-CodexReviewedCommitMatchesHead {
    param(
        [string]$Body,
        [string]$HeadRefOid
    )

    if ([string]::IsNullOrWhiteSpace($Body) -or [string]::IsNullOrWhiteSpace($HeadRefOid)) {
        return $false
    }

    $head = "$HeadRefOid".Trim().ToLowerInvariant()
    if ($head.Length -lt 7) {
        return $false
    }

    $headPrefix = $head.Substring(0, 7)
    $matches = [regex]::Matches($Body, "(?im)Reviewed\s+commit:\s*`?([0-9a-f]{7,40})`?")
    foreach ($m in $matches) {
        $candidate = "$($m.Groups[1].Value)".Trim().ToLowerInvariant()
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        if ($head.StartsWith($candidate) -or $candidate.StartsWith($headPrefix)) {
            return $true
        }
    }

    return $false
}

function Get-GitHubCommitUtcDate {
    param(
        [string]$CommitOid,
        [string]$ContextLabel = "ship-review-gate"
    )

    if ([string]::IsNullOrWhiteSpace($CommitOid)) {
        return [datetime]::MinValue
    }

    $commit = "$CommitOid".Trim().ToLowerInvariant()
    $endpoint = "repos/$GitHubRepo/commits/$commit"
    $resp = Invoke-GhApiWithRetry -Endpoint $endpoint -ContextLabel "$ContextLabel/head-commit"
    if (-not $resp.Success) {
        return [datetime]::MinValue
    }

    try {
        $obj = $resp.Output | ConvertFrom-Json
        $dateValue = $obj.commit.committer.date
        if (-not $dateValue) {
            $dateValue = $obj.commit.author.date
        }
        if (-not $dateValue) {
            return [datetime]::MinValue
        }

        if ($dateValue -is [datetime]) {
            return ([datetime]$dateValue).ToUniversalTime()
        }

        $dateRaw = "$dateValue".Trim()
        if ([string]::IsNullOrWhiteSpace($dateRaw)) {
            return [datetime]::MinValue
        }

        $dto = [datetimeoffset]::MinValue
        if ([datetimeoffset]::TryParse(
                $dateRaw,
                [System.Globalization.CultureInfo]::InvariantCulture,
                [System.Globalization.DateTimeStyles]::AssumeUniversal,
                [ref]$dto
            )) {
            return $dto.UtcDateTime
        }
    }
    catch {
        return [datetime]::MinValue
    }

    return [datetime]::MinValue
}

function Get-CodexReviewSignalsForPr {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PrNumber,
        [Parameter(Mandatory = $true)]
        [string]$HeadRefOid,
        [datetime]$HeadCommitUtc = [datetime]::MinValue,
        [string[]]$BotLogins = @(),
        [string]$ContextLabel = "ship-review-gate",
        [int]$FreshnessSkewSeconds = 90
    )

    $head = "$HeadRefOid".Trim().ToLowerInvariant()
    $errors = New-Object System.Collections.Generic.List[string]
    $findings = New-Object System.Collections.Generic.List[object]
    $pullCommentsAvailable = $false
    $currentCommitSignal = $false
    $currentCommitReviewSeen = $false
    $pullCommentsTotal = 0
    $botPullCommentsTotal = 0

    $pullCommentsEndpoint = "repos/$GitHubRepo/pulls/$PrNumber/comments?per_page=100"
    $pullCommentsResp = Invoke-GhApiWithRetry -Endpoint $pullCommentsEndpoint -ContextLabel "$ContextLabel/pull-comments"
    if (-not $pullCommentsResp.Success) {
        $errors.Add("No se pudieron leer pull comments: $($pullCommentsResp.Error)")
    }
    else {
        try {
            $pullComments = @($pullCommentsResp.Output | ConvertFrom-Json)
            $pullCommentsAvailable = $true
            $pullCommentsTotal = $pullComments.Count
        }
        catch {
            $errors.Add("No se pudieron parsear pull comments: $_")
            $pullComments = @()
        }

        foreach ($comment in $pullComments) {
            $authorLogin = "$($comment.user.login)"
            if (-not (Test-IsCodexBotAuthor -Login $authorLogin -AllowedLogins $BotLogins)) {
                continue
            }
            $botPullCommentsTotal++

            $commentCommit = "$($comment.commit_id)".Trim().ToLowerInvariant()
            $originalCommit = "$($comment.original_commit_id)".Trim().ToLowerInvariant()
            $commentCreatedUtc = [datetime]::MinValue
            $commentCreatedValue = $comment.created_at
            if ($commentCreatedValue -is [datetime]) {
                $commentCreatedUtc = ([datetime]$commentCreatedValue).ToUniversalTime()
            }
            else {
                $commentCreatedRaw = "$commentCreatedValue".Trim()
                if (-not [string]::IsNullOrWhiteSpace($commentCreatedRaw)) {
                    $commentCreatedDto = [datetimeoffset]::MinValue
                    if ([datetimeoffset]::TryParse(
                            $commentCreatedRaw,
                            [System.Globalization.CultureInfo]::InvariantCulture,
                            [System.Globalization.DateTimeStyles]::AssumeUniversal,
                            [ref]$commentCreatedDto
                        )) {
                        $commentCreatedUtc = $commentCreatedDto.UtcDateTime
                    }
                }
            }

            $headCommitKnown = $HeadCommitUtc -ne [datetime]::MinValue
            $isFreshForHead = $true
            if ($headCommitKnown -and $commentCreatedUtc -ne [datetime]::MinValue) {
                $freshnessThreshold = $HeadCommitUtc.AddSeconds(-1 * [math]::Abs($FreshnessSkewSeconds))
                $isFreshForHead = $commentCreatedUtc -ge $freshnessThreshold
            }

            $isCurrentCommit = $false
            if (-not [string]::IsNullOrWhiteSpace($originalCommit) -and $originalCommit -eq $head) {
                $isCurrentCommit = $true
            }
            elseif (-not [string]::IsNullOrWhiteSpace($commentCommit) -and $commentCommit -eq $head -and $isFreshForHead) {
                $isCurrentCommit = $true
            }

            if (-not $isCurrentCommit) {
                continue
            }

            $currentCommitSignal = $true
            $line = 0
            [void][int]::TryParse("$($comment.line)", [ref]$line)
            if ($line -le 0) {
                [void][int]::TryParse("$($comment.original_line)", [ref]$line)
            }
            $severity = Get-CodexSeverityFromBody -Body "$($comment.body)"
            $findings.Add([pscustomobject]@{
                    severity      = $severity
                    severityLabel = "P$severity"
                    source        = "pull_comment"
                    path          = "$($comment.path)"
                    line          = $line
                    url           = "$($comment.html_url)"
                    summary       = Get-CodexReviewShortMessage -Body "$($comment.body)"
                    commitId      = if ($commentCommit) { $commentCommit } else { $originalCommit }
                })
        }
    }

    $reviewsEndpoint = "repos/$GitHubRepo/pulls/$PrNumber/reviews?per_page=100"
    $reviewsResp = Invoke-GhApiWithRetry -Endpoint $reviewsEndpoint -ContextLabel "$ContextLabel/reviews"
    if (-not $reviewsResp.Success) {
        $errors.Add("No se pudieron leer reviews: $($reviewsResp.Error)")
    }
    else {
        try {
            $reviews = @($reviewsResp.Output | ConvertFrom-Json)
        }
        catch {
            $errors.Add("No se pudieron parsear reviews: $_")
            $reviews = @()
        }

        $headPrefix = if ($head.Length -ge 7) { $head.Substring(0, 7) } else { $head }
        foreach ($review in $reviews) {
            $authorLogin = "$($review.user.login)"
            if (-not (Test-IsCodexBotAuthor -Login $authorLogin -AllowedLogins $BotLogins)) {
                continue
            }

            $reviewCommit = "$($review.commit_id)".Trim().ToLowerInvariant()
            $matchesCommit = $false
            if (-not [string]::IsNullOrWhiteSpace($reviewCommit)) {
                if ($reviewCommit -eq $head -or $head.StartsWith($reviewCommit) -or $reviewCommit.StartsWith($headPrefix)) {
                    $matchesCommit = $true
                }
            }

            $bodyMatches = Test-CodexReviewedCommitMatchesHead -Body "$($review.body)" -HeadRefOid $head
            if ($matchesCommit -or $bodyMatches) {
                $currentCommitReviewSeen = $true
                $currentCommitSignal = $true
            }
        }
    }

    $issueCommentsEndpoint = "repos/$GitHubRepo/issues/$PrNumber/comments?per_page=100"
    $issueCommentsResp = Invoke-GhApiWithRetry -Endpoint $issueCommentsEndpoint -ContextLabel "$ContextLabel/issue-comments"
    if ($issueCommentsResp.Success) {
        try {
            $issueComments = @($issueCommentsResp.Output | ConvertFrom-Json)
        }
        catch {
            $errors.Add("No se pudieron parsear issue comments: $_")
            $issueComments = @()
        }

        foreach ($issueComment in $issueComments) {
            $authorLogin = "$($issueComment.user.login)"
            if (-not (Test-IsCodexBotAuthor -Login $authorLogin -AllowedLogins $BotLogins)) {
                continue
            }

            if (-not (Test-CodexReviewedCommitMatchesHead -Body "$($issueComment.body)" -HeadRefOid $head)) {
                continue
            }

            $currentCommitSignal = $true
            $severity = Get-CodexSeverityFromBody -Body "$($issueComment.body)"
            $findings.Add([pscustomobject]@{
                    severity      = $severity
                    severityLabel = "P$severity"
                    source        = "issue_comment"
                    path          = ""
                    line          = 0
                    url           = "$($issueComment.html_url)"
                    summary       = Get-CodexReviewShortMessage -Body "$($issueComment.body)"
                    commitId      = ""
                })
        }
    }
    else {
        $errors.Add("No se pudieron leer issue comments (informativo): $($issueCommentsResp.Error)")
    }

    return [pscustomobject]@{
        Success                 = $pullCommentsAvailable
        Errors                  = @($errors.ToArray())
        Findings                = @($findings.ToArray())
        HasCurrentCommitSignal  = $currentCommitSignal
        CurrentCommitReviewSeen = $currentCommitReviewSeen
        PullCommentsTotal       = $pullCommentsTotal
        BotPullCommentsTotal    = $botPullCommentsTotal
    }
}

function Invoke-CodexReviewGate {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PrNumber,
        [string]$ContextLabel = "ship"
    )

    $cfg = Get-CodexReviewGateConfig
    if (-not $cfg.Enabled) {
        Write-Host "ℹ️ Codex Review Gate deshabilitado por env (SPEEDSUITE_SHIP_REVIEW_GATE=off)."
        return
    }

    if ($PrNumber -le 0) {
        $msg = "PR number inválido para Codex Review Gate ($ContextLabel)."
        if ($cfg.FailMode -eq "closed") {
            throw "❌ $msg"
        }
        Write-Warning "⚠️ $msg Continuando (fail-open)."
        return
    }

    $prMetaRaw = (gh pr view $PrNumber --repo $GitHubRepo --json "number,url,headRefOid,headRefName" 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) {
        $msg = "No se pudo leer metadata del PR #$PrNumber para Codex Review Gate. Detalle: $($prMetaRaw.Trim())"
        if ($cfg.FailMode -eq "closed") {
            throw "❌ $msg"
        }
        Write-Warning "⚠️ $msg Continuando (fail-open)."
        return
    }

    try {
        $prMeta = $prMetaRaw | ConvertFrom-Json
    }
    catch {
        $msg = "No se pudo parsear metadata del PR #$PrNumber para Codex Review Gate: $_"
        if ($cfg.FailMode -eq "closed") {
            throw "❌ $msg"
        }
        Write-Warning "⚠️ $msg Continuando (fail-open)."
        return
    }

    $headRefOid = "$($prMeta.headRefOid)".Trim().ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($headRefOid)) {
        $msg = "headRefOid vacío en PR #$PrNumber para Codex Review Gate."
        if ($cfg.FailMode -eq "closed") {
            throw "❌ $msg"
        }
        Write-Warning "⚠️ $msg Continuando (fail-open)."
        return
    }

    $headShort = if ($headRefOid.Length -ge 10) { $headRefOid.Substring(0, 10) } else { $headRefOid }
    $headCommitUtc = Get-GitHubCommitUtcDate -CommitOid $headRefOid -ContextLabel $ContextLabel
    Write-Host "🤖 Codex Review Gate :: PR #$PrNumber :: head=$headShort :: block<=P$($cfg.BlockMax) :: wait=$($cfg.WaitSeconds)s :: failMode=$($cfg.FailMode)"

    $deadline = (Get-Date).AddSeconds($cfg.WaitSeconds)
    $lastResult = $null
    while ($true) {
        $lastResult = Get-CodexReviewSignalsForPr -PrNumber $PrNumber -HeadRefOid $headRefOid -HeadCommitUtc $headCommitUtc -BotLogins $cfg.BotLogins -ContextLabel $ContextLabel

        if (-not $lastResult.Success) {
            $detail = if ($lastResult.Errors.Count -gt 0) { $lastResult.Errors[0] } else { "sin detalle" }
            $msg = "Codex Review Gate no pudo leer comentarios del PR #${PrNumber}: $detail"
            if ($cfg.FailMode -eq "closed") {
                throw "❌ $msg"
            }
            Write-Warning "⚠️ $msg. Continuando (fail-open)."
            return
        }

        $findings = @($lastResult.Findings)
        $blocking = @($findings | Where-Object { [int]$_.severity -le $cfg.BlockMax })
        if ($blocking.Count -gt 0) {
            Write-Host ""
            Write-Host "╔══════════════════════════════════════════════════════════════╗"
            Write-Host "║     🛑 CODEX REVIEW GATE BLOQUEA ESTE SHIP                  ║"
            Write-Host "╠══════════════════════════════════════════════════════════════╣"
            foreach ($f in ($blocking | Sort-Object severity, path, line)) {
                $location = "(sin archivo)"
                if (-not [string]::IsNullOrWhiteSpace("$($f.path)")) {
                    $location = if ($f.line -gt 0) { "$($f.path):$($f.line)" } else { "$($f.path)" }
                }
                Write-Host "║  [$($f.severityLabel)] $location"
                Write-Host "║      $($f.summary)"
                if (-not [string]::IsNullOrWhiteSpace("$($f.url)")) {
                    Write-Host "║      $($f.url)"
                }
            }
            Write-Host "╠══════════════════════════════════════════════════════════════╣"
            Write-Host "║  Acción: corregir, commit, push y reintentar /ShipWorktree  ║"
            Write-Host "╚══════════════════════════════════════════════════════════════╝"
            Write-Host ""
            throw "🛑 Codex Review Gate bloqueó el ship (hallazgos P0..P$($cfg.BlockMax) del commit actual)."
        }

        if ($lastResult.HasCurrentCommitSignal) {
            if ($findings.Count -gt 0) {
                $nonBlocking = @($findings | Where-Object { [int]$_.severity -gt $cfg.BlockMax })
                foreach ($f in ($nonBlocking | Sort-Object severity, path, line)) {
                    $location = "(sin archivo)"
                    if (-not [string]::IsNullOrWhiteSpace("$($f.path)")) {
                        $location = if ($f.line -gt 0) { "$($f.path):$($f.line)" } else { "$($f.path)" }
                    }
                    Write-Host "ℹ️ Codex Review Gate no bloqueante [$($f.severityLabel)] $location :: $($f.summary)"
                    if (-not [string]::IsNullOrWhiteSpace("$($f.url)")) {
                        Write-Host "   ↳ $($f.url)"
                    }
                }
            }
            else {
                Write-Host "✅ Codex Review Gate: revisión detectada para commit actual sin hallazgos accionables."
            }
            return
        }

        if ($cfg.WaitSeconds -le 0) {
            break
        }

        $now = Get-Date
        if ($now -ge $deadline) {
            break
        }

        $remaining = [int][Math]::Ceiling(($deadline - $now).TotalSeconds)
        Write-Host "⏳ Codex Review Gate: aún sin señales del commit actual; reintentando en $($cfg.PollSeconds)s (restante ~${remaining}s)."
        Start-Sleep -Seconds $cfg.PollSeconds
    }

    Write-Warning "⚠️ Codex Review Gate: no se detectaron comentarios/review del bot para el commit actual en $($cfg.WaitSeconds)s. Continuando (fail-open)."
}

function Invoke-PushWithLeaseOrForceFallback {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$BranchName,
        [string]$ContextLabel = "ship-push"
    )

    $pushOut = git -C $RepoPath push -u origin $BranchName --force-with-lease 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        if ($pushOut) { Write-Host $pushOut.Trim() }
        return
    }

    if ($pushOut -match "stale info") {
        Write-Warning "⚠️ '$ContextLabel': push con --force-with-lease devolvió stale info. Reintentando con --force..."
        $forceOut = git -C $RepoPath push -u origin $BranchName --force 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) {
            if ($forceOut) { Write-Host $forceOut.Trim() }
            return
        }
        throw "❌ Push --force también falló durante '$ContextLabel'. Detalle: $forceOut"
    }

    throw "❌ Push falló durante '$ContextLabel'. Detalle: $pushOut"
}
function Ensure-FixedMonitorLock {
    param(
        [Parameter(Mandatory = $true)]
        $Config
    )

    Use-AtomicLock {
        $lockData = Read-ScopeLock
        $existing = $lockData.locks | Where-Object { $_.scope -eq $Config.scope } | Select-Object -First 1
        if ($existing) {
            $existing.agent = $Config.agent
            $existing.branch = $Config.branch
            $existing.path = $Config.path
            if (-not $existing.created) {
                $existing.created = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }
        }
        else {
            $lockData.locks += @{
                scope   = $Config.scope
                agent   = $Config.agent
                branch  = $Config.branch
                path    = $Config.path
                created = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }
        }
        Save-ScopeLock $lockData
    }
}

function Ensure-FixedMonitorWorktree {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [switch]$FreshFromLocalMain
    )

    $created = $false
    $previousPathExisted = $false
    $freshRecreated = $false
    Use-AtomicLock {
        if (-not (Test-Path $TreeRoot)) {
            New-Item -ItemType Directory -Path $TreeRoot -Force | Out-Null
        }

        if ($FreshFromLocalMain) {
            $previousPathExisted = Test-Path $Config.path
            if ($previousPathExisted) {
                $null = Remove-WorktreeDirectoryRobust -WorktreePath $Config.path -BranchName $Config.branch
            }

            Push-Location $MainRepo
            try {
                git worktree prune 2>&1 | Out-Null

                git show-ref --verify --quiet "refs/heads/$($Config.branch)" 2>&1 | Out-Null
                $branchExists = ($LASTEXITCODE -eq 0)
                if ($branchExists) {
                    git branch -D $Config.branch 2>&1 | Out-Null
                    if ($LASTEXITCODE -ne 0) {
                        throw "❌ No se pudo eliminar la rama fija '$($Config.branch)' para recrear '$($Config.display)' desde '$BaseBranch' local."
                    }
                }

                git worktree add $Config.path -b $Config.branch $BaseBranch 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    throw "❌ Error recreando worktree fijo '$($Config.display)' desde '$BaseBranch' local."
                }

                $created = $true
                $freshRecreated = $true
            }
            finally {
                Pop-Location
            }
        }
        else {
            if (Test-Path $Config.path) {
                if (-not (Test-Path (Join-Path $Config.path ".git"))) {
                    throw "❌ '$($Config.path)' existe pero no es un worktree válido."
                }
            }
            else {
                Push-Location $MainRepo
                try {
                    git fetch $PrimaryRemote $BaseBranch --prune 2>&1 | Out-Null
                    if ($LASTEXITCODE -ne 0) { throw "❌ Error en git fetch $BaseRef --prune" }

                    git show-ref --verify --quiet "refs/heads/$($Config.branch)" 2>&1 | Out-Null
                    $branchExists = ($LASTEXITCODE -eq 0)
                    if ($branchExists) {
                        git worktree add $Config.path $Config.branch 2>&1 | Out-Null
                    }
                    else {
                        git worktree add $Config.path -b $Config.branch $BaseRef 2>&1 | Out-Null
                    }
                    if ($LASTEXITCODE -ne 0) {
                        throw "❌ Error creando worktree fijo '$($Config.display)'."
                    }
                    $created = $true
                }
                finally {
                    Pop-Location
                }
            }
        }
    }

    $currentBranch = (git -C $Config.path branch --show-current | Out-String).Trim()
    if (-not $currentBranch) {
        throw "❌ No se pudo detectar la rama actual en $($Config.path)."
    }
    if ($currentBranch -ne $Config.branch) {
        $dirty = (git -C $Config.path status --porcelain | Measure-Object).Count -gt 0
        if ($dirty) {
            throw "❌ El worktree '$($Config.display)' tiene cambios y está en rama '$currentBranch'. Resolver manualmente antes de continuar."
        }
        git -C $Config.path checkout $Config.branch 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "❌ No se pudo cambiar a rama fija '$($Config.branch)' en '$($Config.path)'."
        }
    }

    Ensure-FixedMonitorLock -Config $Config
    if ($created) {
        Install-WorktreeDependencies -WorktreePath $Config.path
    }

    return [pscustomobject]@{
        created            = $created
        previousPathExisted = $previousPathExisted
        freshRecreated     = $freshRecreated
    }
}

function Invoke-GitAutoCommitIfDirty {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$CommitMessage,
        [string]$ContextLabel = "autosave"
    )

    $hasChanges = (git -C $RepoPath status --porcelain | Measure-Object).Count -gt 0
    if (-not $hasChanges) {
        Write-Host "ℹ️ No hay cambios pendientes para $ContextLabel en '$RepoPath'."
        return $false
    }

    Write-Host "📝 ${ContextLabel}: detectados cambios pendientes en '$RepoPath'. Commiteando..."
    Ensure-WorktreeDependenciesReady -WorktreePath $RepoPath -ContextLabel "$ContextLabel/deps"
    Ensure-LintPluginDistReady -WorktreePath $RepoPath -ContextLabel "$ContextLabel/lint-plugin"

    git -C $RepoPath add -A
    if ($LASTEXITCODE -ne 0) { throw "❌ git add falló durante '$ContextLabel'." }

    git -C $RepoPath commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) { throw "❌ git commit falló durante '$ContextLabel'." }

    return $true
}

function Get-MonitorAheadBehind {
    param(
        [Parameter(Mandatory = $true)]
        $Config
    )

    git -C $Config.path fetch $PrimaryRemote $BaseBranch --prune 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "❌ No se pudo hacer fetch de $BaseRef para '$($Config.display)'."
    }

    $aheadRaw = (git -C $Config.path rev-list --count "$BaseRef..$($Config.branch)" | Out-String).Trim()
    $behindRaw = (git -C $Config.path rev-list --count "$($Config.branch)..$BaseRef" | Out-String).Trim()

    $ahead = 0
    $behind = 0
    [void][int]::TryParse($aheadRaw, [ref]$ahead)
    [void][int]::TryParse($behindRaw, [ref]$behind)

    return [pscustomobject]@{
        ahead  = $ahead
        behind = $behind
    }
}

function Ensure-FixedMonitorUpstreamMain {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [string]$ContextLabel = "fixed-monitor"
    )

    $upstream = (git -C $Config.path rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -eq 0 -and $upstream -eq $BaseRef) {
        return
    }

    git -C $Config.path branch --set-upstream-to=$BaseRef $Config.branch 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "⚠️ No se pudo normalizar upstream a $BaseRef para '$($Config.display)' durante '$ContextLabel'."
        return
    }

    Write-Host "🔁 Upstream normalizado a $BaseRef para '$($Config.display)' ($ContextLabel)."
}

function Invoke-FixedMonitorOpen {
    param(
        [Parameter(Mandatory = $true)]
        [string]$MonitorKey
    )

    $config = Get-FixedMonitorConfig -RawKey $MonitorKey
    $mainSyncOk = Sync-MainLocalNonDestructive
    if ($mainSyncOk) {
        Write-Host "✅ '$BaseBranch' local sincronizado antes de abrir '$($config.display)'."
    }
    else {
        Write-Warning "⚠️ No se pudo sincronizar '$BaseBranch' local antes de abrir '$($config.display)'. Continuando con estado seguro actual."
    }

    $openState = Ensure-FixedMonitorWorktree -Config $config -FreshFromLocalMain
    Ensure-FixedMonitorUpstreamMain -Config $config -ContextLabel "fixed-open"
    Ensure-WorktreeDependenciesReady -WorktreePath $config.path -ContextLabel "$($config.display)/fixed-open"
    Ensure-LintPluginDistReady -WorktreePath $config.path -ContextLabel "$($config.display)/fixed-open"
    $autosaveMsg = "chore(monitor-$($config.key)): session-start autosave"
    $committed = Invoke-GitAutoCommitIfDirty -RepoPath $config.path -CommitMessage $autosaveMsg -ContextLabel "session-start autosave"
    $aheadBehind = Get-MonitorAheadBehind -Config $config

    Write-Host ""
    Write-Host "═══════════════════════════════════════════"
    Write-Host "✅ MONITOR LISTO: $($config.display)"
    Write-Host "   Path:   $($config.path)"
    Write-Host "   Branch: $($config.branch)"
    Write-Host "   Scope:  $($config.scope)"
    Write-Host "   Estado vs ${BaseRef}: ahead=$($aheadBehind.ahead), behind=$($aheadBehind.behind)"
    if ($mainSyncOk) {
        Write-Host "   Base local sync: ✅ actualizado contra $BaseRef"
    }
    else {
        Write-Host "   Base local sync: ⚠️ no sincronizado (bloqueado por estado local)"
    }
    Write-Host "   Session sync monitor: ✅ recreado fresco desde '$BaseBranch' local"
    if ($openState.previousPathExisted) {
        Write-Host "   Worktree: 🧹 previo eliminado y recreado desde cero"
    }
    else {
        Write-Host "   Worktree: ✅ creado fresco porque no existía"
    }
    if ($committed) {
        Write-Host "   Autosave: ✅ commit local realizado"
    }
    else {
        Write-Host "   Autosave: ℹ️ sin cambios pendientes"
    }
    Write-Host "   Para trabajar: cd $($config.path)"
    Write-Host "═══════════════════════════════════════════"
    Write-Host ""
}

function Invoke-FixedMonitorShip {
    param(
        [Parameter(Mandatory = $true)]
        [string]$MonitorKey
    )

    $config = Get-FixedMonitorConfig -RawKey $MonitorKey
    $null = Ensure-FixedMonitorWorktree -Config $config
    [void](Invoke-MainLocalAutosanitizeForShip)

    Push-Location $config.path
    try {
        Ensure-WorktreeDependenciesReady -WorktreePath $config.path -ContextLabel "$($config.display)/fixed-ship"
        Ensure-LintPluginDistReady -WorktreePath $config.path -ContextLabel "$($config.display)/fixed-ship"
        Ensure-FixedMonitorUpstreamMain -Config $config -ContextLabel "fixed-ship-start"

        $initialAheadBehind = Get-MonitorAheadBehind -Config $config
        $dirtyAtStart = (git -C $config.path status --porcelain | Measure-Object).Count -gt 0
        if (-not $dirtyAtStart -and $initialAheadBehind.ahead -eq 0) {
            if ($initialAheadBehind.behind -gt 0) {
                Write-Host "🔄 '$($config.display)' está detrás de $BaseRef sin cambios propios. Realineando..."
                git checkout $config.branch 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "❌ No se pudo hacer checkout de '$($config.branch)'." }
                git reset --hard $BaseRef 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "❌ No se pudo resetear '$($config.branch)' a $BaseRef." }
            }

            Ensure-FixedMonitorUpstreamMain -Config $config -ContextLabel "fixed-ship-noop"
            Ensure-FixedMonitorLock -Config $config
            $afterNoop = Get-MonitorAheadBehind -Config $config
            Write-Host "ℹ️ '$($config.display)' sin cambios para enviar. Se omite ship."
            return [pscustomobject]@{
                monitor       = $config.display
                key           = $config.key
                branch        = $config.branch
                prNumber      = $null
                prUrl         = $null
                mergeCommit   = $null
                mainCi        = "not-required"
                ahead         = $afterNoop.ahead
                behind        = $afterNoop.behind
                status        = "skipped-no-changes"
            }
        }

        Ensure-GitHubTooling -RepoPath $config.path -RequireGh
        $shipRouteOverride = Get-ShipRouteOverride
        if ($shipRouteOverride -ne "auto") {
            Write-Host "🧭 Ship route override activo (fixed): $shipRouteOverride"
        }
        Write-Host "🚢 Ship monitor '$($config.display)' ($($config.branch))"
        Ensure-WorktreeDependenciesReady -WorktreePath $config.path -ContextLabel $config.display
        Write-Host "🔨 Compilando y verificando localmente..."
        Use-SpeedSuiteCacheEnv {
            npm run build
        }
        if ($LASTEXITCODE -ne 0) { throw "❌ Build falló para '$($config.display)'." }

        Use-SpeedSuiteCacheEnv {
            pwsh -File scripts/ci/run-gh-parity.ps1 -Event pull_request -Strict:$true -LockMode skip -LockMaxWaitSeconds 90 -LockPollSeconds 5 -TierParallelProfile adaptive-local
        }
        if ($LASTEXITCODE -ne 0) { throw "❌ Verificación de paridad local falló para '$($config.display)'." }

        $preShipMessage = "chore(monitor-$($config.key)): pre-ship autosave"
        [void](Invoke-GitAutoCommitIfDirty -RepoPath $config.path -CommitMessage $preShipMessage -ContextLabel "pre-ship autosave")

        Write-Host "🔄 Rebaseando '$($config.branch)' sobre $BaseRef..."
        git fetch $PrimaryRemote $BaseBranch --prune
        if ($LASTEXITCODE -ne 0) { throw "❌ Fetch falló para '$($config.display)'." }

        git rebase $BaseRef 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            git rebase --abort 2>&1 | Out-Null
            throw "❌ Rebase con conflictos en '$($config.display)'. Resolver en el worktree y reintentar."
        }

        Write-Host "🚀 Pushing $($config.branch)..."
        Update-RemoteBranchLeaseInfo -RepoPath $config.path -BranchName $config.branch -ContextLabel "$($config.display)/fixed-ship-push"
        Invoke-PushWithLeaseOrForceFallback -RepoPath $config.path -BranchName $config.branch -ContextLabel "$($config.display)/fixed-ship-push"

        $prList = gh pr list --head $config.branch --json number 2>$null | ConvertFrom-Json
        $prNumber = 0
        if ($null -eq $prList -or $prList.Count -eq 0) {
            Write-Host "📋 Creando Pull Request para '$($config.display)'..."
            $headRef = Get-GitHubHeadRef -RepoRef $GitHubRepo -BranchName $config.branch
            gh pr create --repo $GitHubRepo --base $BaseBranch --head $headRef --fill
            if ($LASTEXITCODE -ne 0) { throw "❌ Error creando PR para '$($config.display)'." }
            $newPr = gh pr list --head $config.branch --json number 2>$null | ConvertFrom-Json
            if ($newPr -and $newPr.Count -gt 0) {
                [void][int]::TryParse("$($newPr[0].number)", [ref]$prNumber)
            }
        }
        else {
            Write-Host "📝 PR existente (#$($prList[0].number)) para '$($config.display)'. Reutilizando."
            [void][int]::TryParse("$($prList[0].number)", [ref]$prNumber)
        }

        if ($prNumber -gt 0) {
            if ($shipRouteOverride -eq "auto") {
                Clear-PRShipRouteLabels -PrNumber $prNumber -ContextLabel "$($config.display)/fixed-ship"
            }
            else {
                Set-PRShipRouteLabel -PrNumber $prNumber -Route $shipRouteOverride -ContextLabel "$($config.display)/fixed-ship"
            }
        }

        if ($prNumber -le 0) {
            throw "❌ No se pudo resolver número de PR para '$($config.display)'."
        }

        Invoke-CodexReviewGate -PrNumber $prNumber -ContextLabel "$($config.display)/fixed-ship"

        Write-Host "🔀 Habilitando auto-merge (squash) para '$($config.display)'..."
        gh pr merge $config.branch --squash --delete-branch --auto
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️ No se pudo habilitar auto-merge. Puede que ya esté habilitado."
        }

        $prCiOk = Wait-PRRequiredChecksSuccess -PrNumber $prNumber -ContextLabel "$($config.display)/fixed-ship-pr" -MaxWaitSeconds 1800
        if (-not $prCiOk) {
            throw "🛑 CI del PR falló para '$($config.display)'. Corregir y reintentar."
        }

        Write-Host "✅ CI PR exitoso. Esperando auto-merge para '$($config.display)'..."
        $mergeResult = Wait-PRMerged -Branch $config.branch -MaxWaitSeconds 900
        if (-not $mergeResult.Merged) {
            throw "❌ El PR de '$($config.display)' no se mergeó en el tiempo esperado."
        }

        Ensure-RemoteBranchDeleted -RepoPath $config.path -BranchName $config.branch -ContextLabel "$($config.display)/fixed-ship-post-merge"

        $mergeCommitSha = "$($mergeResult.MergeCommitSha)"
        if ([string]::IsNullOrWhiteSpace($mergeCommitSha)) {
        Write-Warning "⚠️ No se pudo resolver merge commit de '$($config.display)'. Fallback CI global de '$BaseBranch'."
            $ciPassed = Wait-MainCI -MaxWaitSeconds 600
        }
        else {
            $ciPassed = Wait-MainCIForCommit -CommitSha $mergeCommitSha -PrNumber $mergeResult.PrNumber -MaxWaitSeconds 600
        }
        if (-not $ciPassed) {
        throw "❌ CI de '$BaseBranch' no quedó en verde para '$($config.display)'."
        }
        Write-Host "🔄 Realineando rama fija '$($config.branch)' a $BaseRef..."
        git fetch $PrimaryRemote $BaseBranch --prune
        if ($LASTEXITCODE -ne 0) { throw "❌ Fetch final falló para '$($config.display)'." }

        git checkout $config.branch 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "❌ No se pudo hacer checkout de '$($config.branch)'." }

        git reset --hard $BaseRef 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "❌ No se pudo resetear '$($config.branch)' a $BaseRef." }

        Ensure-FixedMonitorUpstreamMain -Config $config -ContextLabel "fixed-ship-post-reset"
        Ensure-FixedMonitorLock -Config $config

        $mainSyncOk = Sync-MainLocalNonDestructive
        if (-not $mainSyncOk) {
            throw "❌ No se pudo dejar '$BaseBranch' local sincronizado tras fixed-ship de '$($config.display)'."
        }

        $aheadBehind = Get-MonitorAheadBehind -Config $config
        return [pscustomobject]@{
            monitor       = $config.display
            key           = $config.key
            branch        = $config.branch
            prNumber      = $mergeResult.PrNumber
            prUrl         = $mergeResult.PrUrl
            mergeCommit   = $mergeResult.MergeCommitSha
            mainCi        = "success"
            ahead         = $aheadBehind.ahead
            behind        = $aheadBehind.behind
            status        = "merged"
        }
    }
    finally {
        Pop-Location
    }
}

function Show-FixedMonitors {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗"
    Write-Host "║                Fixed Monitor Worktrees                      ║"
    Write-Host "╠══════════════════════════════════════════════════════════════╣"
    foreach ($key in $FixedMonitorOrder) {
        $cfg = Get-FixedMonitorConfig -RawKey $key
        $exists = Test-Path $cfg.path
        $branch = if ($exists) { (git -C $cfg.path branch --show-current | Out-String).Trim() } else { "-" }
        $dirty = if ($exists) { if ((git -C $cfg.path status --porcelain | Measure-Object).Count -gt 0) { "yes" } else { "no" } } else { "-" }
        $ahead = "-"
        $behind = "-"
        if ($exists -and $branch) {
            try {
                $ab = Get-MonitorAheadBehind -Config $cfg
                $ahead = "$($ab.ahead)"
                $behind = "$($ab.behind)"
            }
            catch {
                $ahead = "?"
                $behind = "?"
            }
        }
        Write-Host "║  $($cfg.display):"
        Write-Host "║    path=$($cfg.path)"
        Write-Host "║    branch=$branch dirty=$dirty ahead=$ahead behind=$behind"
    }
    Write-Host "╚══════════════════════════════════════════════════════════════╝"
    Write-Host ""
}

function Test-FixedShipAllFailureIsNonRetriable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FailureText
    )

    $patterns = @(
        "Monitor inválido",
        "no es un worktree válido",
        "Modo MCP detectado en flujo que requiere gh",
        "gh no autenticado",
        "No se pudo preparar eslint-plugin-speedsuite/dist"
    )

    foreach ($pattern in $patterns) {
        if ($FailureText -like "*$pattern*") {
            return $true
        }
    }

    return $false
}

function Invoke-FixedShipAllAutoRepair {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$FailureText
    )

    if (
        $FailureText -like "*git commit falló durante 'session-start autosave'*" -or
        $FailureText -like "*git commit falló durante 'pre-ship autosave'*" -or
        $FailureText -like "*eslint-plugin-speedsuite*"
    ) {
        Write-Host "🧰 Auto-repair '$($Config.display)': normalizando dependencias/commit hooks..."
        Ensure-WorktreeDependenciesReady -WorktreePath $Config.path -ContextLabel "$($Config.display)/auto-repair"
        Ensure-LintPluginDistReady -WorktreePath $Config.path -ContextLabel "$($Config.display)/auto-repair"
        return $true
    }

    return $false
}

function Get-FixedShipAllRetryDelaySeconds {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Attempt,
        [Parameter(Mandatory = $true)]
        [int]$ConsecutiveSameFailureCount
    )

    if ($ConsecutiveSameFailureCount -ge 5) {
        return [Math]::Min($FixedShipAllMaxRetrySeconds, 60)
    }

    if ($Attempt -le 1) {
        return $FixedShipAllBaseRetrySeconds
    }

    $exp = [Math]::Min(2, ($Attempt - 1))
    $delay = [int]($FixedShipAllBaseRetrySeconds * [Math]::Pow(2, $exp))
    return [Math]::Min($FixedShipAllMaxRetrySeconds, $delay)
}

function Write-FixedShipAllSummary {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.Generic.List[object]]$Results,
        [string]$AbortedReason
    )

    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗"
    Write-Host "║         RESUMEN FINAL /ShipearTodosLosWorktrees            ║"
    Write-Host "╠══════════════════════════════════════════════════════════════╣"
    foreach ($r in $Results) {
        $prLabel = if ($r.prNumber) { "PR #$($r.prNumber)" } else { "PR n/a" }
        Write-Host "║  $($r.monitor) | $prLabel | status=$($r.status) | mainCI=$($r.mainCi) | intento=$($r.attempt)"
        if ($r.prUrl) {
            Write-Host "║    $($r.prUrl)"
        }
        if ($r.error) {
            Write-Host "║    error=$($r.error)"
        }
    }
    if ($AbortedReason) {
        Write-Host "╠══════════════════════════════════════════════════════════════╣"
        Write-Host "║  ESTADO GLOBAL: ABORTADO                                     ║"
        Write-Host "║  Motivo: $AbortedReason"
    }
    Write-Host "╚══════════════════════════════════════════════════════════════╝"
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════
function Assert-RequiredParams {
    if (-not $Type) { throw "❌ Falta parámetro: Type (feat, fix, chore, ...)" }
    if (-not $Agent) { throw "❌ Falta parámetro: Agent (ag1, ag2, ...)" }
    if (-not $Scope) { throw "❌ Falta parámetro: Scope (adblock, smartcache, ...)" }
    if ($Type -notin $ValidCommitTypes) {
        throw "❌ Type inválido '$Type'. Valores válidos: $($ValidCommitTypes -join ', ')"
    }
}

function Ensure-GitHubTooling {
    param(
        [string]$RepoPath,
        [switch]$RequireGh
    )

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "❌ git no está disponible en PATH."
    }

    $bootstrapScript = Join-Path $MainRepo "scripts\github-tooling-bootstrap.ps1"
    if (Test-Path $bootstrapScript) {
        $doctorRaw = ""
        try {
            $doctorRaw = & pwsh -NoProfile -File $bootstrapScript -RepoPath $RepoPath -Json
        }
        catch {
            $doctorRaw = ""
        }
        if ($doctorRaw) {
            try {
                $doctor = $doctorRaw | ConvertFrom-Json
                if ($doctor.mode -eq "gh") {
                    $ghUser = if ($doctor.gh_user) { $doctor.gh_user } else { "unknown" }
                    Write-Host "🔐 GitHub mode activo: gh (user=$ghUser)"
                    return
                }
                $repoRef = if ($doctor.repo_owner -and $doctor.repo_name) {
                    "$($doctor.repo_owner)/$($doctor.repo_name)"
                }
                else {
                    "(repo no detectado)"
                }
                if ($RequireGh) {
                    Write-Host "❌ GitHub mode activo: MCP (gh inválido/no disponible)."
                    Write-Host "   Repo: $repoRef"
                    Write-Host "   Reautentica: gh auth login -h github.com"
                    Write-Host "   Fallback manual MCP: create_pull_request, get_pull_request_status, merge_pull_request."
                    throw "❌ Modo MCP detectado en flujo que requiere gh."
                }
                Write-Host "ℹ️ GitHub mode activo: MCP"
                return
            }
            catch {
                Write-Warning "⚠️ gh:doctor devolvió salida inválida. Aplicando fallback local."
            }
        }
    }

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        if ($RequireGh) {
            throw "❌ gh CLI no está instalado. Fallback manual: usar MCP GitHub tools."
        }
        Write-Host "ℹ️ GitHub mode activo: MCP (gh no instalado)"
        return
    }

    $env:GH_PROMPT_DISABLED = "1"
    $login = ""
    try { $login = gh api user --jq .login 2>$null } catch {}
    if ($LASTEXITCODE -eq 0 -and $login) {
        Write-Host "🔐 GitHub mode activo: gh (user=$($login.Trim()))"
        return
    }
    if ($RequireGh) {
        Write-Host "❌ gh no autenticado para este flujo."
        Write-Host "   Reautentica: gh auth login -h github.com"
        Write-Host "   Fallback manual: usar MCP GitHub tools (create PR/checks/merge)."
        throw "❌ Modo MCP detectado en flujo que requiere gh."
    }

    Write-Host "ℹ️ GitHub mode activo: MCP"
}

function Use-SpeedSuiteCacheEnv {
    param([scriptblock]$Action)

    $oldNpmCache = $env:NPM_CONFIG_CACHE
    $oldNpmPrefix = $env:NPM_CONFIG_PREFIX
    $oldTemp = $env:TEMP
    $oldTmp = $env:TMP
    $oldPath = $env:PATH

    try {
        New-Item -ItemType Directory -Force -Path $SpeedCacheRoot, $NpmCacheDir, $TmpDir, $NpmGlobalDir | Out-Null
        $env:NPM_CONFIG_CACHE = $NpmCacheDir
        $env:NPM_CONFIG_PREFIX = $NpmGlobalDir
        $env:TEMP = $TmpDir
        $env:TMP = $TmpDir
        if (Test-Path (Join-Path $NpmGlobalDir "npm.cmd")) {
            $env:PATH = "$NpmGlobalDir;$env:PATH"
        }
        & $Action
    }
    finally {
        if ($null -eq $oldNpmCache) { Remove-Item Env:NPM_CONFIG_CACHE -ErrorAction SilentlyContinue } else { $env:NPM_CONFIG_CACHE = $oldNpmCache }
        if ($null -eq $oldNpmPrefix) { Remove-Item Env:NPM_CONFIG_PREFIX -ErrorAction SilentlyContinue } else { $env:NPM_CONFIG_PREFIX = $oldNpmPrefix }
        if ($null -eq $oldTemp) { Remove-Item Env:TEMP -ErrorAction SilentlyContinue } else { $env:TEMP = $oldTemp }
        if ($null -eq $oldTmp) { Remove-Item Env:TMP -ErrorAction SilentlyContinue } else { $env:TMP = $oldTmp }
        if ($null -eq $oldPath) { Remove-Item Env:PATH -ErrorAction SilentlyContinue } else { $env:PATH = $oldPath }
    }
}

function Get-FileSha256 {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash
}

function Try-SeedNodeModulesFromMain {
    param([string]$WorktreePath)

    $mainLockPath = Join-Path $MainRepo "package-lock.json"
    $worktreeLockPath = Join-Path $WorktreePath "package-lock.json"
    $mainNodeModulesPath = Join-Path $MainRepo "node_modules"
    $worktreeNodeModulesPath = Join-Path $WorktreePath "node_modules"

    if (-not (Test-Path $mainNodeModulesPath)) {
        Write-Host "ℹ️  Reuso de dependencias no disponible: '$mainNodeModulesPath' no existe."
        return $false
    }

    $mainLockHash = Get-FileSha256 -Path $mainLockPath
    $worktreeLockHash = Get-FileSha256 -Path $worktreeLockPath

    if (-not $mainLockHash -or -not $worktreeLockHash) {
        Write-Host "ℹ️  Reuso de dependencias omitido: no se pudo leer package-lock.json."
        return $false
    }

    if ($mainLockHash -ne $worktreeLockHash) {
        Write-Host "ℹ️  Reuso de dependencias omitido: lockfile de main y worktree no coincide."
        return $false
    }

    Write-Host "⚡ Reutilizando node_modules desde main (lockfile idéntico)..."
    if (Test-Path $worktreeNodeModulesPath) {
        $removed = Remove-DirectoryRobust -Path $worktreeNodeModulesPath
        if (-not $removed) {
            Write-Warning "⚠️  No se pudo limpiar '$worktreeNodeModulesPath' para reusar node_modules desde main."
            return $false
        }
    }

    $null = robocopy $mainNodeModulesPath $worktreeNodeModulesPath /MIR /COPY:DAT /DCOPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
    $rc = $LASTEXITCODE
    if ($rc -ge 8) {
        Write-Warning "⚠️  Falló la copia de node_modules desde main (robocopy exit=$rc)."
        return $false
    }

    Write-Host "✅ node_modules copiado desde main (robocopy exit=$rc)."
    return $true
}

function Install-WorktreeDependencies {
    param([string]$WorktreePath)

    Write-Host "📦 Preparando dependencias del worktree..."
    $reusedFromMain = Try-SeedNodeModulesFromMain -WorktreePath $WorktreePath
    if ($reusedFromMain) {
        return
    }

    Write-Host "📦 Instalando dependencias con npm (fallback)..."
    Push-Location $WorktreePath
    try {
        Use-SpeedSuiteCacheEnv {
            npm ci --prefer-offline --no-audit --no-fund 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "⚠️ npm ci falló. Intentando npm install..."
                npm install --prefer-offline --no-audit --no-fund 2>&1
                if ($LASTEXITCODE -ne 0) {
                    throw "❌ npm install también falló en worktree."
                }
            }
        }
    }
    finally {
        Pop-Location
    }
}

function Ensure-WorktreeDependenciesReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorktreePath,
        [string]$ContextLabel = "worktree"
    )

    $nodeModulesPath = Join-Path $WorktreePath "node_modules"
    $runPCommandPath = Join-Path $WorktreePath "node_modules\.bin\run-p.cmd"
    $runPPsPath = Join-Path $WorktreePath "node_modules\.bin\run-p.ps1"
    $requiresRunP = Test-RunPRequired -RepoPath $WorktreePath

    $hasNodeModules = Test-Path $nodeModulesPath
    $hasRunP = (-not $requiresRunP) -or (Test-Path $runPCommandPath) -or (Test-Path $runPPsPath)

    if ($hasNodeModules -and $hasRunP) {
        Write-Host "📦 Dependencias OK para '$ContextLabel'."
        return
    }

    Write-Host "📦 Dependencias incompletas para '$ContextLabel' (node_modules=$hasNodeModules, run-p-required=$requiresRunP, run-p=$hasRunP). Reinstalando..."
    Install-WorktreeDependencies -WorktreePath $WorktreePath
}

function Sync-MainLocalNonDestructive {
    param(
        [switch]$RunBuild
    )

    Write-Host "🔄 Sincronizando rama base local con $BaseRef (NO destructivo)..."
    Push-Location $MainRepo
    try {
        $requiredBuildArtifacts = @(
            "dist/content-scripts/auto-booster-main.js",
            "dist/content-scripts/auto-booster-isolated.js"
        )
        $allowedGeneratedDirtyPrefixes = @(
            "public/faust/",
            "src/generated/"
        )
        $currentBranch = git branch --show-current
        $dirty = (git status --porcelain | Measure-Object).Count -gt 0
        if ($dirty) {
            $noiseCleanup = Clear-IgnorableMainLocalDirtyState -RepoPath $MainRepo -AllowedPrefixes $allowedGeneratedDirtyPrefixes
            if ($noiseCleanup.Cleared) {
                $restoredList = $noiseCleanup.RestoredPaths -join ", "
                Write-Host "🧽 Se restauró dirty state ignorable en '$BaseBranch' local: $restoredList"
                $dirty = (git status --porcelain | Measure-Object).Count -gt 0
            }
        }
        if ($dirty) {
            Write-Warning "⚠️ Repo base tiene cambios locales. Se omite sync para evitar pérdida accidental."
            if ($RunBuild -and $currentBranch -eq $BaseBranch) {
                $dirtyState = Test-AllowedMainLocalDirtyState -RepoPath $MainRepo -AllowedPrefixes $allowedGeneratedDirtyPrefixes
                if ($dirtyState.Allowed) {
                    try {
                        $baseState = Get-RefAheadBehindCounts -RepoPath $MainRepo -BaseRef $BaseRef -TargetRef $BaseBranch
                        if ($baseState.ahead -eq 0 -and $baseState.behind -eq 0) {
                            Write-Host "ℹ️ '$BaseBranch' local ya está alineado con $BaseRef. Se fuerza rebuild verificado aunque el repo tenga artefactos generados pendientes."
                            return Invoke-VerifiedProductionBuild -RepoPath $MainRepo -BranchLabel "$BaseBranch local" -RequiredRelativePaths $requiredBuildArtifacts
                        }
                    }
                    catch {
                        Write-Warning "⚠️ No se pudo verificar alineación de '$BaseBranch' local contra ${BaseRef}: $_"
                    }
                }
                else {
                    $blockedList = $dirtyState.BlockedPaths -join ", "
                    Write-Warning "⚠️ Dirty state incluye rutas fuera del allowlist seguro para auto-build: $blockedList"
                }
            }
            return $false
        }

        if ($currentBranch -ne $BaseBranch) {
            $env:SPEEDSUITE_SKIP_POST_SYNC = "1"
            try {
                git checkout $BaseBranch 2>&1 | Out-Null
            }
            finally {
                Remove-Item Env:SPEEDSUITE_SKIP_POST_SYNC -ErrorAction SilentlyContinue
            }
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "⚠️ No se pudo hacer checkout a '$BaseBranch'. Se conserva estado local."
                return $false
            }
        }

        git fetch $PrimaryRemote $BaseBranch
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "⚠️ git fetch $BaseRef falló. Se conserva estado local."
            return $false
        }

        $env:SPEEDSUITE_SKIP_POST_SYNC = "1"
        try {
            git merge --ff-only $BaseRef 2>&1 | Out-Null
        }
        finally {
            Remove-Item Env:SPEEDSUITE_SKIP_POST_SYNC -ErrorAction SilentlyContinue
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "⚠️ No fast-forward posible hacia $BaseRef. Se conserva estado local sin cambios destructivos."
            return $false
        }

        if ($RunBuild) {
            return Invoke-VerifiedProductionBuild -RepoPath $MainRepo -BranchLabel "$BaseBranch local" -RequiredRelativePaths $requiredBuildArtifacts
        }

        return $true
    }
    catch {
        Write-Warning "⚠️ Error en sincronización no destructiva de '$BaseBranch': $_"
        return $false
    }
    finally {
        Pop-Location
    }
}

function Get-RefAheadBehindCounts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$BaseRef,
        [Parameter(Mandatory = $true)]
        [string]$TargetRef
    )

    $raw = (git -C $RepoPath rev-list --left-right --count "$BaseRef...$TargetRef" | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) {
        throw "❌ No se pudo obtener ahead/behind para '$TargetRef' vs '$BaseRef' en '$RepoPath'."
    }

    $parts = $raw -split "\s+"
    if ($parts.Count -lt 2) {
        throw "❌ Salida inválida de rev-list: '$raw'."
    }

    $behind = 0
    $ahead = 0
    [void][int]::TryParse("$($parts[0])", [ref]$behind)
    [void][int]::TryParse("$($parts[1])", [ref]$ahead)

    return [pscustomobject]@{
        behind = $behind
        ahead  = $ahead
    }
}

function Wait-VerifyRunSuccessForBranch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Branch,
        [string]$ContextLabel = "ship",
        [int]$RunLookupTimeoutSeconds = 600
    )

    Write-Host "⏳ Esperando CI verify.yml para '$Branch' ($ContextLabel)..."
    Start-Sleep -Seconds 15

    $runId = $null
    $runDeadline = (Get-Date).AddSeconds($RunLookupTimeoutSeconds)
    while ((Get-Date) -lt $runDeadline -and -not $runId) {
        $runListStr = (gh run list --repo $GitHubRepo --workflow verify.yml --branch $Branch --limit 3 --json "databaseId,status,conclusion") | Out-String
        try {
            $runList = $runListStr | ConvertFrom-Json
            if ($runList -and $runList.Count -gt 0) {
                $latestRun = $runList[0]
                $candidateId = "$($latestRun.databaseId)"
                Write-Host "   Run candidato ($ContextLabel): ID=$candidateId status=$($latestRun.status)"
                if ($candidateId -and $candidateId -ne "0") {
                    $runId = $candidateId
                }
            }
        }
        catch {
            Write-Host "   Aviso parseando JSON ($ContextLabel): $_"
        }
        if (-not $runId) {
            Write-Host "   ⏳ Esperando run de CI para '$Branch'..."
            Start-Sleep -Seconds 15
        }
    }

    if (-not $runId) {
        throw "❌ No se encontró run de verify.yml para '$Branch' ($ContextLabel)."
    }

    $savedPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    gh run watch $runId --repo $GitHubRepo 2>&1
    $checksExitCode = $LASTEXITCODE
    $ErrorActionPreference = $savedPref

    $finalRunStr = (gh run list --repo $GitHubRepo --workflow verify.yml --branch $Branch --limit 1 --json "databaseId,status,conclusion") | Out-String
    try {
        $finalRun = $finalRunStr | ConvertFrom-Json
        if ($finalRun -and $finalRun.Count -gt 0) {
            $runConclusion = $finalRun[0].conclusion
            Write-Host "   CI conclusion ($ContextLabel): $runConclusion"
            if ($runConclusion -eq "success") {
                $checksExitCode = 0
            }
            else {
                $checksExitCode = 1
            }
        }
    }
    catch {
        Write-Host "   No se pudo verificar conclusion final ($ContextLabel)."
    }

    return ($checksExitCode -eq 0)
}

function Wait-PRRequiredChecksSuccess {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PrNumber,
        [string]$ContextLabel = "ship",
        [int]$MaxWaitSeconds = 1800
    )

    if ($PrNumber -le 0) {
        throw "❌ Número de PR inválido para esperar checks requeridos ($ContextLabel)."
    }

    Write-Host "⏳ Esperando checks requeridos del PR #$PrNumber ($ContextLabel)..."
    $deadline = (Get-Date).AddSeconds($MaxWaitSeconds)
    $reviewCfg = Get-CodexReviewGateConfig
    $ciResumeCfg = Get-ShipCiResumeConfig
    $pollSeconds = if ($ciResumeCfg.Enabled) { [Math]::Max(5, $ciResumeCfg.PollSeconds) } else { 20 }
    $reviewHeadRefOid = ""
    $reviewSignalSeen = $false
    $seenFindingKeys = New-Object 'System.Collections.Generic.HashSet[string]'
    $rerunsByRunId = @{}
    $failureStableCounts = @{}
    $permissionDeniedRunIds = New-Object 'System.Collections.Generic.HashSet[string]'

    if ($ciResumeCfg.Enabled) {
        $targetsText = ($ciResumeCfg.TargetChecks -join ", ")
        Write-Host "♻️ CI Resume monitor activo :: maxReruns=$($ciResumeCfg.MaxReruns) :: poll=${pollSeconds}s :: failMode=$($ciResumeCfg.FailMode) :: targets=$targetsText"
    }

    if ($reviewCfg.Enabled) {
        $prMetaRaw = (gh pr view $PrNumber --repo $GitHubRepo --json "number,url,headRefOid,headRefName" 2>&1 | Out-String)
        if ($LASTEXITCODE -ne 0) {
            $msg = "No se pudo leer metadata del PR #$PrNumber para monitor de Codex Review. Detalle: $($prMetaRaw.Trim())"
            if ($reviewCfg.FailMode -eq "closed") {
                Write-Host "   ❌ $msg"
                return $false
            }
            Write-Warning "⚠️ $msg Continuando monitor CI sin gate (fail-open)."
            $reviewCfg.Enabled = $false
        }
        else {
            try {
                $prMeta = $prMetaRaw | ConvertFrom-Json
                $reviewHeadRefOid = "$($prMeta.headRefOid)".Trim().ToLowerInvariant()
            }
            catch {
                $msg = "No se pudo parsear metadata del PR #$PrNumber para monitor de Codex Review: $_"
                if ($reviewCfg.FailMode -eq "closed") {
                    Write-Host "   ❌ $msg"
                    return $false
                }
                Write-Warning "⚠️ $msg Continuando monitor CI sin gate (fail-open)."
                $reviewCfg.Enabled = $false
            }
        }

        if ($reviewCfg.Enabled -and [string]::IsNullOrWhiteSpace($reviewHeadRefOid)) {
            $msg = "headRefOid vacío en PR #$PrNumber para monitor de Codex Review."
            if ($reviewCfg.FailMode -eq "closed") {
                Write-Host "   ❌ $msg"
                return $false
            }
            Write-Warning "⚠️ $msg Continuando monitor CI sin gate (fail-open)."
            $reviewCfg.Enabled = $false
        }

        if ($reviewCfg.Enabled) {
            $headShort = if ($reviewHeadRefOid.Length -ge 10) { $reviewHeadRefOid.Substring(0, 10) } else { $reviewHeadRefOid }
            Write-Host "🤖 Codex Review monitor activo en espera CI :: head=$headShort :: block<=P$($reviewCfg.BlockMax) :: failMode=$($reviewCfg.FailMode)"
        }
    }

    $reviewHeadCommitUtc = [datetime]::MinValue
    if ($reviewCfg.Enabled) {
        $reviewHeadCommitUtc = Get-GitHubCommitUtcDate -CommitOid $reviewHeadRefOid -ContextLabel "$ContextLabel/codex-monitor"
    }

    while ((Get-Date) -lt $deadline) {
        if ($reviewCfg.Enabled) {
            $reviewSignals = Get-CodexReviewSignalsForPr -PrNumber $PrNumber -HeadRefOid $reviewHeadRefOid -HeadCommitUtc $reviewHeadCommitUtc -BotLogins $reviewCfg.BotLogins -ContextLabel "$ContextLabel/codex-monitor"
            if (-not $reviewSignals.Success) {
                $detail = if ($reviewSignals.Errors -and $reviewSignals.Errors.Count -gt 0) { $reviewSignals.Errors[0] } else { "sin detalle" }
                $msg = "Monitor de Codex Review no pudo leer comentarios del PR #${PrNumber}: $detail"
                if ($reviewCfg.FailMode -eq "closed") {
                    Write-Host "   ❌ $msg"
                    return $false
                }
                Write-Warning "⚠️ $msg. Continuando (fail-open)."
            }
            else {
                if ($reviewSignals.HasCurrentCommitSignal -and -not $reviewSignalSeen) {
                    $reviewSignalSeen = $true
                    Write-Host "✅ Codex Review: señal detectada para commit actual (monitor en paralelo con CI)."
                }

                $blockingFindings = @($reviewSignals.Findings | Where-Object { [int]$_.severity -le $reviewCfg.BlockMax })
                if ($blockingFindings.Count -gt 0) {
                    Write-Host ""
                    Write-Host "╔══════════════════════════════════════════════════════════════╗"
                    Write-Host "║  🛑 CODEX REVIEW DETECTÓ HALLAZGOS BLOQUEANTES DURANTE CI   ║"
                    Write-Host "╠══════════════════════════════════════════════════════════════╣"
                    foreach ($f in ($blockingFindings | Sort-Object severity, path, line)) {
                        $location = "(sin archivo)"
                        if (-not [string]::IsNullOrWhiteSpace("$($f.path)")) {
                            $location = if ($f.line -gt 0) { "$($f.path):$($f.line)" } else { "$($f.path)" }
                        }
                        $findingKey = "$($f.severityLabel)|$location|$($f.summary)|$($f.url)"
                        if ($seenFindingKeys.Contains($findingKey)) {
                            continue
                        }
                        [void]$seenFindingKeys.Add($findingKey)
                        Write-Host "║  [$($f.severityLabel)] $location"
                        Write-Host "║      $($f.summary)"
                        if (-not [string]::IsNullOrWhiteSpace("$($f.url)")) {
                            Write-Host "║      $($f.url)"
                        }
                    }
                    Write-Host "╠══════════════════════════════════════════════════════════════╣"
                    Write-Host "║  Acción: corregir, commit, push y reintentar /ShipWorktree  ║"
                    Write-Host "╚══════════════════════════════════════════════════════════════╝"
                    Write-Host ""
                    gh pr merge $PrNumber --repo $GitHubRepo --disable-auto 2>$null | Out-Null
                    return $false
                }
            }
        }

        $checksStr = (gh pr checks $PrNumber --repo $GitHubRepo --required --json "name,state,bucket,workflow,link" 2>&1 | Out-String)
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ⏳ Aún sin datos de checks requeridos para PR #$PrNumber. Reintentando..."
            Start-Sleep -Seconds $pollSeconds
            continue
        }

        $checks = @()
        try {
            $parsed = $checksStr | ConvertFrom-Json
            if ($parsed) {
                $checks = @($parsed)
            }
        }
        catch {
            Write-Host "   ⚠️ Error parseando checks de PR #$PrNumber ($ContextLabel). Reintentando..."
            Start-Sleep -Seconds $pollSeconds
            continue
        }

        if (-not $checks -or $checks.Count -eq 0) {
            Write-Host "   ⏳ PR #$PrNumber sin checks requeridos visibles aún. Reintentando..."
            Start-Sleep -Seconds $pollSeconds
            continue
        }

        $failed = @(
            $checks | Where-Object {
                $bucket = "$($_.bucket)".ToLowerInvariant()
                $state = "$($_.state)".ToUpperInvariant()
                $bucket -eq "fail" -or $state -in @("FAILURE", "ERROR", "TIMED_OUT", "ACTION_REQUIRED", "CANCELLED")
            }
        )
        $pending = @(
            $checks | Where-Object {
                $bucket = "$($_.bucket)".ToLowerInvariant()
                $state = "$($_.state)".ToUpperInvariant()
                $bucket -eq "pending" -or $state -in @("PENDING", "QUEUED", "IN_PROGRESS", "WAITING", "REQUESTED")
            }
        )

        if ($failed.Count -gt 0) {
            $failedKeysThisPoll = New-Object 'System.Collections.Generic.HashSet[string]'
            foreach ($f in $failed) {
                $runId = Get-RunIdFromCheckLink -Link "$($f.link)"
                $stableKey = if (-not [string]::IsNullOrWhiteSpace($runId)) { "run:$runId" } else { "check:$($f.name)|$($f.workflow)" }
                [void]$failedKeysThisPoll.Add($stableKey)
                if ($failureStableCounts.ContainsKey($stableKey)) {
                    $failureStableCounts[$stableKey] = [int]$failureStableCounts[$stableKey] + 1
                }
                else {
                    $failureStableCounts[$stableKey] = 1
                }
            }

            $keysToRemove = @()
            foreach ($key in $failureStableCounts.Keys) {
                if (-not $failedKeysThisPoll.Contains("$key")) {
                    $keysToRemove += "$key"
                }
            }
            foreach ($key in $keysToRemove) {
                $failureStableCounts.Remove($key) | Out-Null
            }

            $rerunTriggered = $false
            if ($ciResumeCfg.Enabled -and $ciResumeCfg.MaxReruns -gt 0) {
                $targetFailed = @($failed | Where-Object { Test-IsShipCiResumeTargetCheck -Check $_ -TargetChecks $ciResumeCfg.TargetChecks })
                $targetRunIds = New-Object 'System.Collections.Generic.HashSet[string]'

                foreach ($f in $targetFailed) {
                    $runId = Get-RunIdFromCheckLink -Link "$($f.link)"
                    if ([string]::IsNullOrWhiteSpace($runId)) {
                        continue
                    }

                    $stableKey = "run:$runId"
                    $stableCount = if ($failureStableCounts.ContainsKey($stableKey)) { [int]$failureStableCounts[$stableKey] } else { 0 }
                    if ($stableCount -lt 2) {
                        Write-Host "   ⏳ CI Resume: detectado fail en run $runId pero aún no estable (polls=$stableCount)."
                        continue
                    }

                    if ($targetRunIds.Contains($runId)) {
                        continue
                    }
                    [void]$targetRunIds.Add($runId)

                    $rerunsUsed = if ($rerunsByRunId.ContainsKey($runId)) { [int]$rerunsByRunId[$runId] } else { 0 }
                    if ($rerunsUsed -ge $ciResumeCfg.MaxReruns) {
                        Write-Host "   ⚠️ CI Resume: run $runId agotó presupuesto de rerun ($rerunsUsed/$($ciResumeCfg.MaxReruns))."
                        continue
                    }

                    $runView = Get-GitHubRunForResume -RunId $runId
                    if (-not $runView.Success) {
                        $msg = "CI Resume no pudo leer run_id=${runId}: $($runView.Error)"
                        if ($ciResumeCfg.FailMode -eq "closed") {
                            Write-Host "   ❌ $msg"
                            return $false
                        }
                        Write-Warning "⚠️ $msg. Continuando (fail-open)."
                        continue
                    }

                    $runStatus = "$($runView.Run.status)".Trim().ToLowerInvariant()
                    $runConclusion = "$($runView.Run.conclusion)".Trim().ToLowerInvariant()
                    if ($runStatus -ne "completed") {
                        Write-Host "   ⏳ CI Resume: run $runId aún no completó (status=$runStatus)."
                        continue
                    }

                    $rerunResult = Invoke-GitHubRunRerunFailedJobs -RunId $runId
                    if ($rerunResult.Success) {
                        $rerunsByRunId[$runId] = $rerunsUsed + 1
                        $rerunTriggered = $true
                        Write-Host "♻️ CI Resume: rerun-failed-jobs disparado para run $runId ($($rerunsByRunId[$runId])/$($ciResumeCfg.MaxReruns)) [conclusion previa=$runConclusion]."
                        continue
                    }

                    $isPermissionOrState = ($rerunResult.HttpStatus -in @(403, 404, 422))
                    if ($isPermissionOrState) {
                        [void]$permissionDeniedRunIds.Add($runId)
                        $permMsg = "CI Resume no autorizado/no aplicable para run $runId (HTTP $($rerunResult.HttpStatus)). Puede deberse a permisos del actor original del workflow. Detalle: $($rerunResult.Output)"
                        if ($ciResumeCfg.FailMode -eq "closed") {
                            Write-Host "   ❌ $permMsg"
                            return $false
                        }
                        Write-Warning "⚠️ $permMsg Continuando en fail-open; puede requerir push nuevo."
                        continue
                    }

                    $rerunMsg = "CI Resume falló al disparar rerun para run $runId. Detalle: $($rerunResult.Output)"
                    if ($ciResumeCfg.FailMode -eq "closed") {
                        Write-Host "   ❌ $rerunMsg"
                        return $false
                    }
                    Write-Warning "⚠️ $rerunMsg Continuando en fail-open."
                }
            }

            if ($rerunTriggered) {
                Start-Sleep -Seconds $pollSeconds
                continue
            }

            $targetFailedNow = @($failed | Where-Object { -not $ciResumeCfg.Enabled -or (Test-IsShipCiResumeTargetCheck -Check $_ -TargetChecks $ciResumeCfg.TargetChecks) })
            $pendingNames = if ($pending.Count -gt 0) { ($pending | ForEach-Object { "$($_.name)" } | Select-Object -Unique) -join ", " } else { "" }

            if ($ciResumeCfg.Enabled -and $targetFailedNow.Count -gt 0 -and $pending.Count -gt 0) {
                Write-Host "   ⏳ Checks con fail detectado pero aún hay checks pendientes ($pendingNames). Esperando siguiente poll para decidir."
                Start-Sleep -Seconds $pollSeconds
                continue
            }

            $allTargetRunsExhausted = $true
            foreach ($f in $targetFailedNow) {
                $runId = Get-RunIdFromCheckLink -Link "$($f.link)"
                if ([string]::IsNullOrWhiteSpace($runId)) {
                    $allTargetRunsExhausted = $false
                    break
                }
                $stableKey = "run:$runId"
                $stableCount = if ($failureStableCounts.ContainsKey($stableKey)) { [int]$failureStableCounts[$stableKey] } else { 0 }
                $rerunsUsed = if ($rerunsByRunId.ContainsKey($runId)) { [int]$rerunsByRunId[$runId] } else { 0 }
                if ($stableCount -lt 2 -or $rerunsUsed -lt $ciResumeCfg.MaxReruns) {
                    $allTargetRunsExhausted = $false
                    break
                }
            }

            foreach ($f in $failed) {
                $runId = Get-RunIdFromCheckLink -Link "$($f.link)"
                $rerunsUsed = if (-not [string]::IsNullOrWhiteSpace($runId) -and $rerunsByRunId.ContainsKey($runId)) { [int]$rerunsByRunId[$runId] } else { 0 }
                Write-Host "   ❌ Check fallido: $($f.name) state=$($f.state) bucket=$($f.bucket) runId=$(if($runId){$runId}else{'-'}) reruns=$rerunsUsed/$($ciResumeCfg.MaxReruns)"
            }

            if ($ciResumeCfg.Enabled -and $allTargetRunsExhausted) {
                Write-Host "🛑 CI Resume: presupuesto agotado para checks objetivo. Ship abortado para corrección."
                return $false
            }

            if ($ciResumeCfg.Enabled) {
                Write-Host "   ⏳ CI Resume: fallo detectado sin rerun aplicable en este poll. Reintentando hasta timeout..."
                Start-Sleep -Seconds $pollSeconds
                continue
            }

            return $false
        }

        $failureStableCounts.Clear()

        if ($pending.Count -gt 0) {
            $pendingNames = ($pending | ForEach-Object { "$($_.name)" } | Select-Object -Unique) -join ", "
            Write-Host "   ⏳ Checks pendientes PR #${PrNumber}: $pendingNames"
            Start-Sleep -Seconds $pollSeconds
            continue
        }

        if ($reviewCfg.Enabled) {
            $finalReview = Get-CodexReviewSignalsForPr -PrNumber $PrNumber -HeadRefOid $reviewHeadRefOid -HeadCommitUtc $reviewHeadCommitUtc -BotLogins $reviewCfg.BotLogins -ContextLabel "$ContextLabel/codex-monitor-final"
            if (-not $finalReview.Success) {
                $detail = if ($finalReview.Errors -and $finalReview.Errors.Count -gt 0) { $finalReview.Errors[0] } else { "sin detalle" }
                $msg = "Monitor final de Codex Review no pudo leer comentarios del PR #${PrNumber}: $detail"
                if ($reviewCfg.FailMode -eq "closed") {
                    Write-Host "   ❌ $msg"
                    return $false
                }
                Write-Warning "⚠️ $msg. Continuando (fail-open)."
            }
            else {
                $finalBlocking = @($finalReview.Findings | Where-Object { [int]$_.severity -le $reviewCfg.BlockMax })
                if ($finalBlocking.Count -gt 0) {
                    Write-Host "🛑 Codex Review detectó hallazgos bloqueantes justo antes de cerrar checks. Auto-merge deshabilitado."
                    gh pr merge $PrNumber --repo $GitHubRepo --disable-auto 2>$null | Out-Null
                    return $false
                }
            }
        }

        Write-Host "✅ Checks requeridos del PR #$PrNumber en verde ($ContextLabel)."
        return $true
    }

    Write-Host "⏰ Timeout ($MaxWaitSeconds s) esperando checks requeridos del PR #$PrNumber ($ContextLabel)."
    if ($ciResumeCfg.Enabled -and $permissionDeniedRunIds.Count -gt 0) {
        Write-Warning "⚠️ CI Resume detectó denegaciones de rerun por permisos/estado en run(s): $([string]::Join(', ', @($permissionDeniedRunIds)))"
    }
    return $false
}

function Get-ValidMainRescueBranchName {
    param([string]$CurrentBranch = "")

    $trimmed = "$CurrentBranch".Trim()
    if ($trimmed -match '^(feat|fix|chore|refactor|test|docs|perf|ci)-.+-.+$') {
        return $trimmed
    }

    if ($trimmed -match '^rescue-main-local-(.+)$') {
        return "chore-main-rescue-$($Matches[1])"
    }

    return "chore-main-rescue-{0}" -f (Get-Date -Format "yyyyMMdd-HHmmss")
}

function Normalize-LockPath {
    param([string]$PathValue)

    if (-not $PathValue) { return "" }

    $candidate = "$PathValue".Trim()
    try {
        $candidate = [System.IO.Path]::GetFullPath($candidate)
    }
    catch {}

    $candidate = $candidate.Replace("\", "/").TrimEnd("/")
    if ($candidate -match '^/([a-zA-Z])/(.+)$') {
        $candidate = "$($Matches[1]):/$($Matches[2])"
    }

    return $candidate.ToLowerInvariant()
}

function Get-MainRepoCanonicalPath {
    $canonical = ""
    try {
        $canonical = (git -C $MainRepo rev-parse --show-toplevel | Out-String).Trim()
    }
    catch {}

    if (-not $canonical) {
        $canonical = $MainRepo
    }

    return $canonical
}

function Register-TemporaryMainRescueLock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BranchName
    )

    Use-AtomicLock {
        $lockData = Read-ScopeLock
        $canonicalMainPath = Get-MainRepoCanonicalPath
        $canonicalMainNorm = Normalize-LockPath $canonicalMainPath
        $existing = $lockData.locks | Where-Object {
            (Normalize-LockPath "$($_.path)") -eq $canonicalMainNorm -and "$($_.branch)" -eq $BranchName
        } | Select-Object -First 1
        if ($existing) {
            $existing.scope = "main-rescue"
            $existing.agent = "main-rescue"
            $existing.path = $canonicalMainPath
            if (-not $existing.created) {
                $existing.created = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }
        }
        else {
            $lockData.locks += @{
                scope   = "main-rescue"
                agent   = "main-rescue"
                branch  = $BranchName
                path    = $canonicalMainPath
                created = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }
        }
        Save-ScopeLock $lockData
    }
}

function Test-MainRescueLockPresent {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BranchName
    )

    $lockData = Read-ScopeLock
    $canonicalMainNorm = Normalize-LockPath (Get-MainRepoCanonicalPath)
    $match = $lockData.locks | Where-Object {
        "$($_.agent)" -eq "main-rescue" -and
        "$($_.branch)" -eq $BranchName -and
        (Normalize-LockPath "$($_.path)") -eq $canonicalMainNorm
    } | Select-Object -First 1

    return ($null -ne $match)
}

function Unregister-TemporaryMainRescueLock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BranchName
    )

    Use-AtomicLock {
        $lockData = Read-ScopeLock
        $lockData.locks = @(
            $lockData.locks | Where-Object {
                -not ($_.path -eq $MainRepo -and $_.branch -eq $BranchName -and $_.agent -eq "main-rescue")
            }
        )
        Save-ScopeLock $lockData
    }
}

function Invoke-MainLocalAutosanitizeForShip {
    Write-Host "🧹 Verificando estado de '$BaseBranch' local antes del ship..."
    Ensure-GitHubTooling -RepoPath $MainRepo -RequireGh

    Push-Location $MainRepo
    try {
        git fetch $PrimaryRemote $BaseBranch --prune
        if ($LASTEXITCODE -ne 0) {
            throw "❌ git fetch $BaseRef --prune falló en '$BaseBranch' local."
        }

        $env:SPEEDSUITE_SKIP_POST_SYNC = "1"
        try {
            $currentBranch = (git branch --show-current | Out-String).Trim()
            $rescueBranch = ""
            $lockRegistered = $false
            $allowedGeneratedDirtyPrefixes = @(
                "public/faust/",
                "src/generated/"
            )

            if ($currentBranch -eq $BaseBranch) {
                $dirtyMain = (git status --porcelain | Measure-Object).Count -gt 0
                $abMain = Get-RefAheadBehindCounts -RepoPath $MainRepo -BaseRef $BaseRef -TargetRef $BaseBranch

                if ($dirtyMain -and $abMain.ahead -eq 0 -and $abMain.behind -eq 0) {
                    $noiseCleanup = Clear-IgnorableMainLocalDirtyState -RepoPath $MainRepo -AllowedPrefixes $allowedGeneratedDirtyPrefixes
                    if ($noiseCleanup.Cleared) {
                        $restoredList = $noiseCleanup.RestoredPaths -join ", "
                        Write-Host "🧽 Se limpió dirty state ignorable en '$BaseBranch' local: $restoredList"
                        return $true
                    }
                }

                if (-not $dirtyMain -and $abMain.ahead -eq 0 -and $abMain.behind -eq 0) {
                    Write-Host "✅ '$BaseBranch' local ya está limpio y sincronizado."
                    return $true
                }

                if (-not $dirtyMain -and $abMain.ahead -eq 0 -and $abMain.behind -gt 0) {
                    Write-Host "🔄 '$BaseBranch' local está detrás de $BaseRef sin cambios propios. Fast-forward..."
                    git merge --ff-only $BaseRef 2>&1 | Out-Null
                    if ($LASTEXITCODE -ne 0) {
                        throw "❌ Fast-forward de '$BaseBranch' local hacia $BaseRef falló."
                    }
                    Write-Host "✅ Fast-forward de '$BaseBranch' aplicado."
                    return $true
                }

                $rescueBranch = Get-ValidMainRescueBranchName
                Write-Warning "⚠️ Detectado '$BaseBranch' local con cambios pendientes (dirty=$dirtyMain, ahead=$($abMain.ahead), behind=$($abMain.behind))."
                Write-Host "🚑 Iniciando saneamiento automático vía rama de rescate '$rescueBranch'..."

                git checkout -b $rescueBranch 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    throw "❌ No se pudo crear rama de rescate '$rescueBranch'."
                }
            }
            else {
                $headSha = (git rev-parse HEAD | Out-String).Trim()
                $baseSha = (git rev-parse $BaseRef | Out-String).Trim()
                $dirtyCurrentBranch = (git status --porcelain | Measure-Object).Count -gt 0
                if ($dirtyCurrentBranch -and $headSha -eq $baseSha) {
                    $noiseCleanup = Clear-IgnorableMainLocalDirtyState -RepoPath $MainRepo -AllowedPrefixes $allowedGeneratedDirtyPrefixes
                    if ($noiseCleanup.Cleared) {
                        $restoredList = $noiseCleanup.RestoredPaths -join ", "
                        Write-Host "🧽 Se limpió dirty state ignorable en rama temporal '$currentBranch': $restoredList"
                        git checkout $BaseBranch 2>&1 | Out-Null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Host "✅ '$BaseBranch' local quedó restaurado sin necesidad de rescate."
                            return $true
                        }
                    }
                }

                Write-Warning "⚠️ Repo principal estaba en '$currentBranch'. Se continuará saneamiento sobre rama de rescate."
                $normalizedRescue = Get-ValidMainRescueBranchName -CurrentBranch $currentBranch
                if ($normalizedRescue -ne $currentBranch) {
                    git branch -m $normalizedRescue 2>&1 | Out-Null
                    if ($LASTEXITCODE -ne 0) {
                        throw "❌ No se pudo normalizar rama de rescate '$currentBranch' -> '$normalizedRescue'."
                    }
                    $rescueBranch = $normalizedRescue
                }
                else {
                    $rescueBranch = $currentBranch
                }
                Write-Host "🚑 Continuando saneamiento con rama '$rescueBranch'..."
            }

            Register-TemporaryMainRescueLock -BranchName $rescueBranch
            $lockRegistered = $true

            try {
                $dirtyRescue = (git status --porcelain | Measure-Object).Count -gt 0
                if ($dirtyRescue) {
                    if (-not (Test-MainRescueLockPresent -BranchName $rescueBranch)) {
                        Write-Warning "⚠️ Lock temporal main-rescue ausente antes de commitear. Re-registrando..."
                        Register-TemporaryMainRescueLock -BranchName $rescueBranch
                    }
                    Ensure-LintPluginDistReady -WorktreePath $MainRepo -ContextLabel "main-rescue-commit"
                    git add -A
                    $commitOut = ""
                    $commitSucceeded = $false
                    for ($commitAttempt = 1; $commitAttempt -le 2; $commitAttempt++) {
                        $commitOut = git commit -m "chore(main-rescue): autosanitize local main before ship" 2>&1 | Out-String
                        if ($LASTEXITCODE -eq 0) {
                            $commitSucceeded = $true
                            break
                        }

                        if ($commitOut -match "Worktree no registrado o sin ownership válido" -and $commitAttempt -lt 2) {
                            Write-Warning "⚠️ Ownership lock rechazado durante commit de rescate. Re-registrando y reintentando..."
                            Register-TemporaryMainRescueLock -BranchName $rescueBranch
                            Start-Sleep -Milliseconds 250
                            git add -A
                            continue
                        }

                        break
                    }

                    if (-not $commitSucceeded) {
                        throw "❌ Commit automático en rama de rescate falló. Detalle: $commitOut"
                    }
                }
                else {
                    Write-Host "ℹ️ No había cambios sin commitear; la rama de rescate conserva commits locales ahead de '$BaseBranch'."
                }

                Write-Host "🔄 Rebaseando rama de rescate '$rescueBranch' sobre $BaseRef..."
                git rebase $BaseRef -X theirs 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    git rebase --abort 2>&1 | Out-Null
                    throw "❌ Rebase automático de rama de rescate '$rescueBranch' contra $BaseRef falló."
                }

                Update-RemoteBranchLeaseInfo -RepoPath $MainRepo -BranchName $rescueBranch -ContextLabel "main-rescue-push"
                Invoke-PushWithLeaseOrForceFallback -RepoPath $MainRepo -BranchName $rescueBranch -ContextLabel "main-rescue-push"

                $prList = gh pr list --head $rescueBranch --json number 2>$null | ConvertFrom-Json
                $prNumber = 0
                if ($null -eq $prList -or $prList.Count -eq 0) {
                    Write-Host "📋 Creando PR de saneamiento para '$rescueBranch'..."
                    $headRef = Get-GitHubHeadRef -RepoRef $GitHubRepo -BranchName $rescueBranch
                    gh pr create --repo $GitHubRepo --base $BaseBranch --head $headRef --fill
                    if ($LASTEXITCODE -ne 0) { throw "❌ Error creando PR de saneamiento." }
                    $newPr = gh pr list --head $rescueBranch --json number 2>$null | ConvertFrom-Json
                    if ($newPr -and $newPr.Count -gt 0) {
                        [void][int]::TryParse("$($newPr[0].number)", [ref]$prNumber)
                    }
                }
                else {
                    [void][int]::TryParse("$($prList[0].number)", [ref]$prNumber)
                    Write-Host "📝 PR de saneamiento existente detectado (#$prNumber). Reutilizando."
                }

                if ($prNumber -gt 0) {
                    Clear-PRShipRouteLabels -PrNumber $prNumber -ContextLabel "main-rescue"
                }

                gh pr merge $rescueBranch --squash --delete-branch --auto
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "⚠️ No se pudo habilitar auto-merge para PR de saneamiento. Puede que ya esté habilitado."
                }

                if ($prNumber -gt 0) {
                    $sanitizeCiOk = Wait-PRRequiredChecksSuccess -PrNumber $prNumber -ContextLabel "main-rescue-pr" -MaxWaitSeconds 1800
                }
                else {
                    $sanitizeCiOk = Wait-VerifyRunSuccessForBranch -Branch $rescueBranch -ContextLabel "main-rescue"
                }
                if (-not $sanitizeCiOk) {
                    throw "❌ CI del PR de saneamiento falló para '$rescueBranch'."
                }

                $mergeResult = Wait-PRMerged -Branch $rescueBranch -MaxWaitSeconds 900
                if (-not $mergeResult.Merged) {
                    throw "❌ El PR de saneamiento '$rescueBranch' no se mergeó en tiempo."
                }

                Ensure-RemoteBranchDeleted -RepoPath $MainRepo -BranchName $rescueBranch -ContextLabel "main-rescue-post-merge"

                $mergeCommitSha = "$($mergeResult.MergeCommitSha)"
                if ([string]::IsNullOrWhiteSpace($mergeCommitSha)) {
                    $mainCiOk = Wait-MainCI -MaxWaitSeconds 600
                }
                else {
                    $mainCiOk = Wait-MainCIForCommit -CommitSha $mergeCommitSha -PrNumber $mergeResult.PrNumber -MaxWaitSeconds 600
                }
                if (-not $mainCiOk) {
                    throw "❌ CI post-merge de '$BaseBranch' falló durante saneamiento local."
                }

                git fetch $PrimaryRemote $BaseBranch --prune
                if ($LASTEXITCODE -ne 0) {
                    throw "❌ Fetch final de '$BaseBranch' falló tras saneamiento."
                }

                git checkout $BaseBranch 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    throw "❌ No se pudo volver a '$BaseBranch' tras saneamiento."
                }

                git reset --hard $BaseRef 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    throw "❌ No se pudo resetear '$BaseBranch' local a $BaseRef tras saneamiento."
                }

                git branch -D $rescueBranch 2>$null | Out-Null

                $dirtyFinal = (git status --porcelain | Measure-Object).Count -gt 0
                $abFinal = Get-RefAheadBehindCounts -RepoPath $MainRepo -BaseRef $BaseRef -TargetRef $BaseBranch
                if ($dirtyFinal -or $abFinal.ahead -ne 0 -or $abFinal.behind -ne 0) {
                    throw "❌ '$BaseBranch' local no quedó 100% limpio/sync tras saneamiento (dirty=$dirtyFinal, ahead=$($abFinal.ahead), behind=$($abFinal.behind))."
                }

                Write-Host "✅ Saneamiento de '$BaseBranch' local completado (dirty=false, ahead=0, behind=0)."
                return $true
            }
            finally {
                if ($lockRegistered) {
                    Unregister-TemporaryMainRescueLock -BranchName $rescueBranch
                }
            }
        }
        finally {
            Remove-Item Env:SPEEDSUITE_SKIP_POST_SYNC -ErrorAction SilentlyContinue
        }
    }
    finally {
        Pop-Location
    }
}

function Normalize-PathForCompare {
    param([string]$Path)

    if (-not $Path) {
        return ""
    }

    $rawPath = $Path
    try {
        $rawPath = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
    }
    catch {
        # Path may not exist anymore. We still normalize syntactically.
    }

    $normalized = [System.IO.Path]::GetFullPath($rawPath).TrimEnd('\', '/')
    if ($IsWindows) {
        return $normalized.ToLowerInvariant()
    }

    return $normalized
}

function Test-IsPathEqualOrChild {
    param(
        [string]$Candidate,
        [string]$Parent
    )

    $candidateNorm = Normalize-PathForCompare -Path $Candidate
    $parentNorm = Normalize-PathForCompare -Path $Parent

    if (-not $candidateNorm -or -not $parentNorm) {
        return $false
    }

    if ($candidateNorm -eq $parentNorm) {
        return $true
    }

    return $candidateNorm.StartsWith("$parentNorm\")
}

function Invoke-CmdRmdir {
    param([string]$TargetPath)

    $escapedPath = $TargetPath.Replace('"', '""')
    cmd.exe /d /c "rmdir /s /q `"$escapedPath`"" 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Invoke-CmdClearAttributes {
    param([string]$TargetPath)

    $escapedPath = $TargetPath.Replace('"', '""')
    cmd.exe /d /c "attrib -r -s -h `"$escapedPath\*`" /s /d" 2>&1 | Out-Null
}

function Try-DeleteLocalBranch {
    param([string]$BranchName)

    if (-not $BranchName) {
        return
    }

    Push-Location $MainRepo
    try {
        git show-ref --verify --quiet "refs/heads/$BranchName"
        if ($LASTEXITCODE -ne 0) {
            return
        }

        git branch -D $BranchName 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "🧹 Rama local eliminada: $BranchName"
        }
        else {
            Write-Warning "⚠️ No se pudo eliminar la rama local '$BranchName'."
        }
    }
    finally {
        Pop-Location
    }
}

function Remove-WorktreeDirectoryRobust {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorktreePath,
        [string]$BranchName,
        [int]$MaxAttempts = 8
    )

    if (-not $WorktreePath) {
        throw "❌ WorktreePath inválido para eliminación."
    }

    $worktreeNorm = Normalize-PathForCompare -Path $WorktreePath
    $treeRootNorm = Normalize-PathForCompare -Path $TreeRoot
    $mainRepoNorm = Normalize-PathForCompare -Path $MainRepo

    if ($worktreeNorm -eq $mainRepoNorm) {
        throw "❌ Refusing to delete MainRepo path: $WorktreePath"
    }

    if (-not (Test-IsPathEqualOrChild -Candidate $worktreeNorm -Parent $treeRootNorm)) {
        throw "❌ Refusing to delete path outside TreeRoot. Path='$WorktreePath' TreeRoot='$TreeRoot'"
    }

    if (-not (Test-Path -LiteralPath $WorktreePath)) {
        Write-Host "✅ Directorio ya ausente: $WorktreePath"
        return $true
    }

    $currentLocation = (Get-Location).Path
    if (Test-IsPathEqualOrChild -Candidate $currentLocation -Parent $WorktreePath) {
        Set-Location $MainRepo
        Write-Host "ℹ️ Contexto movido a main para evitar lock de CWD en worktree."
    }

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if (-not (Test-Path -LiteralPath $WorktreePath)) {
            Write-Host "✅ Directorio eliminado: $WorktreePath"
            return $true
        }

        Write-Host "🧹 Intento $attempt/$MaxAttempts de eliminación para $WorktreePath"

        Push-Location $MainRepo
        try {
            try {
                git worktree remove $WorktreePath --force 2>&1 | Out-Null
            }
            catch {}
        }
        finally {
            Pop-Location
        }

        if (-not (Test-Path -LiteralPath $WorktreePath)) {
            Write-Host "✅ Directorio eliminado por git worktree remove."
            if ($BranchName) {
                Try-DeleteLocalBranch -BranchName $BranchName
            }
            return $true
        }

        try {
            Remove-Item -LiteralPath $WorktreePath -Recurse -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "⚠️ Remove-Item falló en intento ${attempt}: $($_.Exception.Message)"
        }

        if (-not (Test-Path -LiteralPath $WorktreePath)) {
            Write-Host "✅ Directorio físico eliminado con Remove-Item."
            if ($BranchName) {
                Try-DeleteLocalBranch -BranchName $BranchName
            }
            return $true
        }

        try {
            Invoke-CmdClearAttributes -TargetPath $WorktreePath
        }
        catch {}

        $cmdDeleted = $false
        try {
            $cmdDeleted = Invoke-CmdRmdir -TargetPath $WorktreePath
        }
        catch {}

        if ($cmdDeleted -or -not (Test-Path -LiteralPath $WorktreePath)) {
            Write-Host "✅ Directorio físico eliminado con cmd rmdir."
            if ($BranchName) {
                Try-DeleteLocalBranch -BranchName $BranchName
            }
            return $true
        }

        $delayMs = [int]([Math]::Min(5000, 250 * [Math]::Pow(2, $attempt - 1)))
        Write-Warning "⚠️ Directorio sigue en uso tras intento $attempt. Reintentando en ${delayMs}ms..."
        Start-Sleep -Milliseconds $delayMs
    }

    Write-Warning "⚠️ No se pudo eliminar '$WorktreePath' tras $MaxAttempts intentos."
    Write-Warning "   Cierra terminales/procesos que usen esa ruta y ejecuta:"
    Write-Warning "   cmd /c `"rmdir /s /q `"$WorktreePath`"`""
    return $false
}

function Start-DeferredCleanupJob {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorktreePath,
        [Parameter(Mandatory = $true)]
        [string]$BranchName,
        [int]$DelaySeconds = 4
    )

    if (-not $WorktreePath -or -not $BranchName) {
        Write-Warning "⚠️ No se pudo programar cleanup diferido: parámetros incompletos."
        return $false
    }

    $worktreeLiteral = $WorktreePath.Replace("'", "''")
    $branchLiteral = $BranchName.Replace("'", "''")
    $lockLiteral = $ScopeLockFile.Replace("'", "''")
    $treeRootLiteral = $TreeRoot.Replace("'", "''")

    $payload = @"
`$target = '$worktreeLiteral'
`$branch = '$branchLiteral'
`$lockFile = '$lockLiteral'
`$treeRoot = '$treeRootLiteral'

Start-Sleep -Seconds $DelaySeconds

for (`$i = 1; `$i -le 12; `$i++) {
    if (-not (Test-Path -LiteralPath `$target)) { break }
    cmd.exe /d /c "attrib -r -s -h `"`$target\*`" /s /d" 2>`$null | Out-Null
    cmd.exe /d /c "rmdir /s /q `"`$target`"" 2>`$null | Out-Null
    if (-not (Test-Path -LiteralPath `$target)) { break }
    Start-Sleep -Milliseconds ([int]([Math]::Min(5000, 250 * [Math]::Pow(2, `$i - 1))))
}

if (Test-Path -LiteralPath `$target) { exit 0 }

try {
    `$targetNorm = [System.IO.Path]::GetFullPath(`$target).TrimEnd('\', '/').ToLowerInvariant()
    `$treeNorm = [System.IO.Path]::GetFullPath(`$treeRoot).TrimEnd('\', '/').ToLowerInvariant()
    if (-not (`$targetNorm -eq `$treeNorm -or `$targetNorm.StartsWith("`$treeNorm\"))) {
        exit 0
    }
}
catch {
    exit 0
}

if (-not (Test-Path -LiteralPath `$lockFile)) { exit 0 }

`$max = 3
for (`$attempt = 1; `$attempt -le `$max; `$attempt++) {
    try {
        `$data = Get-Content -LiteralPath `$lockFile -Raw -Encoding utf8 | ConvertFrom-Json
        if (-not `$data -or -not `$data.locks) {
            `$data = [pscustomobject]@{ locks = @() }
        }
        `$data.locks = @(`$data.locks | Where-Object { `$_.branch -ne `$branch })
        `$tmp = "`$lockFile.tmp"
        `$data | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath `$tmp -Encoding utf8
        Move-Item -LiteralPath `$tmp -Destination `$lockFile -Force
        break
    }
    catch {
        if (`$attempt -eq `$max) { break }
        Start-Sleep -Milliseconds (75 * `$attempt)
    }
}
"@

    $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($payload))
    $pwshPath = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
    if (-not $pwshPath) {
        $pwshPath = Join-Path $PSHOME "pwsh.exe"
    }

    try {
        Start-Process -FilePath $pwshPath `
            -ArgumentList @("-NoLogo", "-NoProfile", "-EncodedCommand", $encoded) `
            -WorkingDirectory $MainRepo `
            -WindowStyle Hidden | Out-Null
        Write-Host "🛰️ Cleanup diferido programado para '$BranchName' (delay ${DelaySeconds}s)."
        return $true
    }
    catch {
        Write-Warning "⚠️ No se pudo iniciar cleanup diferido: $($_.Exception.Message)"
        return $false
    }
}

function Resolve-CleanupTargetLock {
    param(
        [Parameter(Mandatory = $true)]
        $LockData
    )

    $providedValues = @($Type, $Agent, $Scope) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    $providedCount = $providedValues.Count
    $targetBranch = $null
    $targetPath = $null
    $selectionSource = $null

    if ($providedCount -gt 0 -and $providedCount -lt 3) {
        throw "❌ cleanup requiere <type> <agent> <scope> completos o ninguno."
    }

    if ($providedCount -eq 3) {
        $targetBranch = Get-BranchName $Type $Agent $Scope
        $targetPath = Join-Path $TreeRoot $targetBranch
        $selectionSource = "parámetros explícitos"
    }
    else {
        $cwd = (Get-Location).Path
        $repoRoot = $null

        try {
            $repoRoot = (git -C $cwd rev-parse --show-toplevel 2>$null).Trim()
        }
        catch {}

        if (-not $repoRoot) {
            throw "❌ cleanup no pudo detectar el repo actual. Ejecuta desde tu worktree o usa: cleanup <type> <agent> <scope>."
        }

        $repoRootNorm = Normalize-PathForCompare -Path $repoRoot
        $mainRepoNorm = Normalize-PathForCompare -Path $MainRepo
        if ($repoRootNorm -eq $mainRepoNorm) {
            throw "❌ cleanup ejecutado desde main está bloqueado. Para evitar limpiar worktrees ajenos, ejecuta desde tu worktree o usa: cleanup <type> <agent> <scope>."
        }

        if (-not (Test-IsPathEqualOrChild -Candidate $repoRootNorm -Parent $TreeRoot)) {
            throw "❌ cleanup solo puede ejecutarse desde un worktree bajo '$TreeRoot'."
        }

        $targetPath = $repoRoot
        $selectionSource = "contexto del worktree actual"

        try {
            $detectedBranch = (git -C $repoRoot branch --show-current 2>$null).Trim()
            if ($detectedBranch) {
                $targetBranch = $detectedBranch
            }
        }
        catch {}
    }

    $targetPathNorm = if ($targetPath) { Normalize-PathForCompare -Path $targetPath } else { $null }
    $candidates = @($LockData.locks)

    if ($targetBranch) {
        $candidates = @($candidates | Where-Object { "$($_.branch)" -eq $targetBranch })
    }

    if ($targetPathNorm) {
        $pathMatches = @($candidates | Where-Object {
                (Normalize-PathForCompare -Path "$($_.path)") -eq $targetPathNorm
            })
        if ($pathMatches.Count -gt 0) {
            $candidates = $pathMatches
        }
        elseif (-not $targetBranch) {
            $candidates = @()
        }
        else {
            $branchOnlyMatches = @($LockData.locks | Where-Object { "$($_.branch)" -eq $targetBranch })
            if ($branchOnlyMatches.Count -eq 1) {
                Write-Warning "⚠️ Lock encontrado por branch '$targetBranch' pero con path distinto al esperado. Continuando por branch único."
                $candidates = $branchOnlyMatches
            }
        }
    }

    if ($candidates.Count -eq 0) {
        $hint = if ($targetBranch) { "branch '$targetBranch'" } else { "path '$targetPath'" }
        throw "❌ No hay lock activo para el objetivo ($hint). No se realizó limpieza."
    }

    if ($candidates.Count -gt 1) {
        throw "❌ Selección de cleanup ambigua para branch '$targetBranch'. Usa cleanup <type> <agent> <scope> para especificar el objetivo exacto."
    }

    $selected = $candidates[0]
    return @{
        Branch = "$($selected.branch)"
        PathNorm = Normalize-PathForCompare -Path "$($selected.path)"
        Scope = "$($selected.scope)"
        Agent = "$($selected.agent)"
        Source = $selectionSource
    }
}

# ═══════════════════════════════════════════════════════════════
# COMMANDS
# ═══════════════════════════════════════════════════════════════

switch ($Command) {

    # ───────────────────────────────────────────────────────────
    # HELP
    # ───────────────────────────────────────────────────────────
    "help" {
        Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║        Universal Worktree Manager GitHub Adapter v1.0       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  COMMANDS:                                                   ║
║    create <type> <agent> <scope>  Create isolated worktree   ║
║    ship   <type> <agent> <scope>  Build → PR → CI → Merge    ║
║    list                           Show active worktrees       ║
║    fixed-open <monitor>           Open fixed monitor tree     ║
║    fixed-ship <monitor>           Ship fixed monitor tree     ║
║    fixed-ship-all                 Ship all fixed monitor trees║
║                                   (single-instance guarded)    ║
║    fixed-list                     Show fixed monitor status   ║
║    cleanup [<type> <agent> <scope>] Cleanup only own lock     ║
║    scope-check <scope>            Check if scope is locked    ║
║    help                           Show this message           ║
║    (default: hidden; ship/fixed-ship*: foreground live)       ║
║                                                              ║
║  EXAMPLES:                                                   ║
║    .\worktree-manager.ps1 create feat ag1 adblock            ║
║    .\worktree-manager.ps1 ship feat ag1 adblock              ║
║    .\worktree-manager.ps1 fixed-open izq-arriba              ║
║    .\worktree-manager.ps1 fixed-ship izq-arriba              ║
║    .\worktree-manager.ps1 fixed-ship-all                     ║
║    .\ship-live.ps1 feat ag1 adblock                          ║
║    .\worktree-manager.ps1 cleanup                            ║
║    .\worktree-manager.ps1 cleanup feat ag1 adblock           ║
║    .\worktree-manager.ps1 ship ... -Foreground               ║
║                                                              ║
        ║  TREE ROOT: $($TreeRoot)                                      ║
        ║  MAIN REPO: $($MainRepo)                                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@
    }

    # ───────────────────────────────────────────────────────────
    # SCOPE-CHECK
    # ───────────────────────────────────────────────────────────
    "scope-check" {
        $checkScope = if ($Scope) { $Scope } elseif ($Type) { $Type } else { throw "❌ Uso: scope-check <scope>" }

        Use-AtomicLock {
            $lockData = Read-ScopeLock
            $existing = $lockData.locks | Where-Object { $_.scope -eq $checkScope }
            if ($existing) {
                Write-Host "🔒 Scope '$checkScope' OCUPADO por agente '$($existing.agent)' en branch '$($existing.branch)'"
                Write-Host "   Worktree: $($existing.path)"
                Write-Host "   Desde: $($existing.created)"
            }
            else {
                Write-Host "✅ Scope '$checkScope' LIBRE"
            }
        }
    }

    # ───────────────────────────────────────────────────────────
    # FIXED-OPEN
    # ───────────────────────────────────────────────────────────
    "fixed-open" {
        $monitorKey = if ($Type) { $Type } elseif ($Agent) { $Agent } elseif ($Scope) { $Scope } else { throw "❌ Uso: fixed-open <izq-arriba|der-arriba|izq-abajo|der-abajo>" }
        Invoke-FixedMonitorOpen -MonitorKey $monitorKey
    }

    # ───────────────────────────────────────────────────────────
    # FIXED-SHIP
    # ───────────────────────────────────────────────────────────
    "fixed-ship" {
        $monitorKey = if ($Type) { $Type } elseif ($Agent) { $Agent } elseif ($Scope) { $Scope } else { throw "❌ Uso: fixed-ship <izq-arriba|der-arriba|izq-abajo|der-abajo>" }
        $result = Invoke-FixedMonitorShip -MonitorKey $monitorKey
        Write-Host ""
        if ($result.status -eq "skipped-no-changes") {
            Write-Host "ℹ️ FIXED-SHIP OMITIDO: $($result.monitor) (sin cambios para enviar)"
        }
        else {
            Write-Host "✅ FIXED-SHIP COMPLETO: $($result.monitor)"
            Write-Host "   PR: #$($result.prNumber)  $($result.prUrl)"
        }
        Write-Host "   Branch: $($result.branch)"
        Write-Host "   Status: $($result.status)"
        Write-Host "   Main CI: $($result.mainCi)"
        Write-Host "   Post-reset vs ${BaseRef}: ahead=$($result.ahead), behind=$($result.behind)"
        Write-Host ""
    }

    # ───────────────────────────────────────────────────────────
    # FIXED-SHIP-ALL
    # ───────────────────────────────────────────────────────────
    "fixed-ship-all" {
        $results = [System.Collections.Generic.List[object]]::new()
        $abortedReason = $null

        Enter-FixedShipAllSession
        try {
            foreach ($key in $FixedMonitorOrder) {
                $cfg = Get-FixedMonitorConfig -RawKey $key
                $attempt = 0
                $completed = $false
                $lastFailureFingerprint = ""
                $sameFailureCount = 0

                while (-not $completed) {
                    $attempt++
                    Write-Host ""
                    Write-Host "═══════════════════════════════════════════"
                    Write-Host "🚀 fixed-ship-all :: $($cfg.display) :: intento $attempt"
                    Write-Host "═══════════════════════════════════════════"

                    try {
                        Invoke-FixedMonitorOpen -MonitorKey $key
                        $result = Invoke-FixedMonitorShip -MonitorKey $key
                        $result | Add-Member -NotePropertyName attempt -NotePropertyValue $attempt
                        $results.Add($result) | Out-Null
                        $completed = $true
                    }
                    catch {
                        $failureText = "$($_.Exception.Message)"
                        if ([string]::IsNullOrWhiteSpace($failureText)) {
                            $failureText = "$_"
                        }
                        $failureFingerprint = $failureText.Trim()

                        if ($failureFingerprint -eq $lastFailureFingerprint) {
                            $sameFailureCount++
                        }
                        else {
                            $sameFailureCount = 1
                            $lastFailureFingerprint = $failureFingerprint
                        }

                        Write-Warning "⚠️ fixed-ship-all fallo en '$($cfg.display)' (intento $attempt): $failureText"

                        if (Test-FixedShipAllFailureIsNonRetriable -FailureText $failureText) {
                            $results.Add([pscustomobject]@{
                                    monitor     = $cfg.display
                                    key         = $cfg.key
                                    branch      = $cfg.branch
                                    prNumber    = $null
                                    prUrl       = $null
                                    mergeCommit = $null
                                    mainCi      = "failed"
                                    ahead       = $null
                                    behind      = $null
                                    status      = "failed-non-retriable"
                                    attempt     = $attempt
                                    error       = $failureText
                                }) | Out-Null
                            throw "❌ fixed-ship-all abortado por error no reintentable en '$($cfg.display)': $failureText"
                        }

                        if ($attempt -ge $FixedShipAllMaxAttemptsPerMonitor) {
                            $results.Add([pscustomobject]@{
                                    monitor     = $cfg.display
                                    key         = $cfg.key
                                    branch      = $cfg.branch
                                    prNumber    = $null
                                    prUrl       = $null
                                    mergeCommit = $null
                                    mainCi      = "failed"
                                    ahead       = $null
                                    behind      = $null
                                    status      = "failed-max-attempts"
                                    attempt     = $attempt
                                    error       = $failureText
                                }) | Out-Null
                            throw "❌ fixed-ship-all abortado: '$($cfg.display)' superó $FixedShipAllMaxAttemptsPerMonitor intentos."
                        }

                        $repairApplied = $false
                        try {
                            $repairApplied = Invoke-FixedShipAllAutoRepair -Config $cfg -FailureText $failureText
                        }
                        catch {
                            Write-Warning "⚠️ Auto-repair falló para '$($cfg.display)': $($_.Exception.Message)"
                        }

                        if ($repairApplied) {
                            Write-Warning "   Auto-repair aplicado. Reintentando en 5s..."
                            Start-Sleep -Seconds 5
                            continue
                        }

                        $retryDelay = Get-FixedShipAllRetryDelaySeconds -Attempt $attempt -ConsecutiveSameFailureCount $sameFailureCount
                        Write-Warning "   Reintentando automáticamente en ${retryDelay}s (bucle hasta 100% merge)."
                        Start-Sleep -Seconds $retryDelay
                    }
                }
            }
        }
        catch {
            $abortedReason = "$($_.Exception.Message)"
            if ([string]::IsNullOrWhiteSpace($abortedReason)) {
                $abortedReason = "$_"
            }
            throw
        }
        finally {
            Write-FixedShipAllSummary -Results $results -AbortedReason $abortedReason
            Exit-FixedShipAllSession
        }
    }

    # ───────────────────────────────────────────────────────────
    # FIXED-LIST
    # ───────────────────────────────────────────────────────────
    "fixed-list" {
        Show-FixedMonitors
    }

    # ───────────────────────────────────────────────────────────
    # CREATE
    # ───────────────────────────────────────────────────────────
    "create" {
        Assert-RequiredParams

        $BranchName = Get-BranchName $Type $Agent $Scope
        $WorktreePath = Join-Path $TreeRoot $BranchName

        Use-AtomicLock {
            # Check scope availability
            $lockData = Read-ScopeLock
            $existing = $lockData.locks | Where-Object { $_.scope -eq $Scope }
            if ($existing) {
                throw "🔒 Scope '$Scope' ya ocupado por '$($existing.agent)'. Elige otro scope o espera liberación del lock."
            }

            Write-Host "🌳 Creando worktree: $BranchName"
            Write-Host "📁 Path: $WorktreePath"

            # Ensure tree root exists
            if (-not (Test-Path $TreeRoot)) {
                New-Item -ItemType Directory -Path $TreeRoot -Force | Out-Null
                Write-Host "📁 Directorio raíz creado: $TreeRoot"
            }

            # Sync remote catalog
            Write-Host "🔄 Sincronizando catálogo remoto..."
            Push-Location $MainRepo
            try {
                git fetch $PrimaryRemote $BaseBranch
                if ($LASTEXITCODE -ne 0) { throw "❌ Error en git fetch" }

                # Create worktree based on the remote base ref, not the local checkout.
                git worktree add $WorktreePath -b $BranchName $BaseRef
                if ($LASTEXITCODE -ne 0) { throw "❌ Error creando worktree" }
            }
            finally {
                Pop-Location
            }

            # Register scope lock
            $lockEntry = @{
                scope   = $Scope
                agent   = $Agent
                branch  = $BranchName
                path    = $WorktreePath
                created = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }
            $lockData.locks += $lockEntry
            Save-ScopeLock $lockData

            Write-Host "🔒 Scope '$Scope' registrado para '$Agent'"
        }

        # Bootstrap (outside mutex — this takes time)
        Install-WorktreeDependencies -WorktreePath $WorktreePath

        Write-Host ""
        Write-Host "═══════════════════════════════════════════"
        Write-Host "✅ WORKTREE LISTO"
        Write-Host "   Branch: $BranchName"
        Write-Host "   Path:   $WorktreePath"
        Write-Host "   Scope:  $Scope (locked by $Agent)"
        Write-Host ""
        Write-Host "   Para trabajar: cd $WorktreePath"
        Write-Host "   Para preview:  Chrome → Load unpacked → $WorktreePath\dist\"
        Write-Host "═══════════════════════════════════════════"
    }

    # ───────────────────────────────────────────────────────────
    # SHIP
    # ───────────────────────────────────────────────────────────
    "ship" {
        Assert-RequiredParams

        $BranchName = Get-BranchName $Type $Agent $Scope
        $WorktreePath = Join-Path $TreeRoot $BranchName

        if (-not (Test-Path $WorktreePath)) {
            throw "❌ Worktree no encontrado: $WorktreePath"
        }

        Ensure-GitHubTooling -RepoPath $WorktreePath -RequireGh
        [void](Invoke-MainLocalAutosanitizeForShip)

        Push-Location $WorktreePath
        $popped = $false
        try {
            $shipRouteOverride = Get-ShipRouteOverride
            if ($shipRouteOverride -ne "auto") {
                Write-Host "🧭 Ship route override activo (legacy): $shipRouteOverride"
            }
            Ensure-WorktreeDependenciesReady -WorktreePath $WorktreePath -ContextLabel $BranchName

            # Step 1: Build & verify locally
            Write-Host "🔨 Compilando y verificando localmente..."
            Use-SpeedSuiteCacheEnv {
                npm run build
            }
            if ($LASTEXITCODE -ne 0) { throw "❌ Build falló." }

            Use-SpeedSuiteCacheEnv {
                pwsh -File scripts/ci/run-gh-parity.ps1 -Event pull_request -Strict:$true -LockMode skip -LockMaxWaitSeconds 90 -LockPollSeconds 5 -TierParallelProfile adaptive-local
            }
            if ($LASTEXITCODE -ne 0) { throw "❌ Verificación de paridad local falló." }

            # Step 2: Commit (idempotent — skip if no changes)
            $hasChanges = (git status --porcelain | Measure-Object).Count -gt 0
            if ($hasChanges) {
                Write-Host "📝 Committing cambios..."
                Ensure-WorktreeDependenciesReady -WorktreePath $WorktreePath -ContextLabel "$BranchName/ship-commit"
                Ensure-LintPluginDistReady -WorktreePath $WorktreePath -ContextLabel "$BranchName/ship-commit"
                git add -A
                git commit -m "$Type($Scope): auto-ship por $Agent"
                if ($LASTEXITCODE -ne 0) { throw "❌ Commit falló." }
            }
            else {
                Write-Host "⚠️ No hay cambios locales. Re-evaluando PR existente..."
            }

            # Step 3: Rebase on latest remote base branch
            Write-Host "🔄 Sincronizando con $BaseRef..."
            git fetch $PrimaryRemote $BaseBranch
            if ($LASTEXITCODE -ne 0) { throw "❌ Fetch falló." }

            git rebase $BaseRef 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                git rebase --abort 2>&1
                throw "❌ Conflicto de Rebase detectado. Destruye este worktree y recrea."
            }

            # Step 4: Push
            $Branch = git branch --show-current
            Write-Host "🚀 Pushing $Branch..."
            Update-RemoteBranchLeaseInfo -RepoPath $WorktreePath -BranchName $Branch -ContextLabel "$BranchName/ship-push"
            Invoke-PushWithLeaseOrForceFallback -RepoPath $WorktreePath -BranchName $Branch -ContextLabel "$BranchName/ship-push"

            # Step 5: PR Create (IDEMPOTENT — check first)
            $prList = gh pr list --head $Branch --json number 2>$null | ConvertFrom-Json
            $prNumber = 0
            if ($null -eq $prList -or $prList.Count -eq 0) {
                Write-Host "📋 Creando Pull Request..."
                $headRef = Get-GitHubHeadRef -RepoRef $GitHubRepo -BranchName $Branch
                gh pr create --repo $GitHubRepo --base $BaseBranch --head $headRef --fill
                if ($LASTEXITCODE -ne 0) { throw "❌ Error creando PR." }
                $newPr = gh pr list --head $Branch --json number 2>$null | ConvertFrom-Json
                if ($newPr -and $newPr.Count -gt 0) {
                    [void][int]::TryParse("$($newPr[0].number)", [ref]$prNumber)
                }
            }
            else {
                Write-Host "📝 PR existente (#$($prList[0].number)) detectado. Reutilizando."
                [void][int]::TryParse("$($prList[0].number)", [ref]$prNumber)
            }

            if ($prNumber -gt 0) {
                if ($shipRouteOverride -eq "auto") {
                    Clear-PRShipRouteLabels -PrNumber $prNumber -ContextLabel "$BranchName/ship"
                }
                else {
                    Set-PRShipRouteLabel -PrNumber $prNumber -Route $shipRouteOverride -ContextLabel "$BranchName/ship"
                }
            }

            if ($prNumber -le 0) {
                throw "❌ No se pudo resolver número de PR para '$Branch'."
            }

            Invoke-CodexReviewGate -PrNumber $prNumber -ContextLabel "$BranchName/ship"

            # Step 6: Habilitar auto-merge INMEDIATAMENTE (ANTES de esperar CI)
            # Esto le dice a GitHub: "cuando todos los required checks pasen, mergea automaticamente"
            # GitHub mostrara "Auto-merge enabled" en el PR
            Write-Host "🔀 Habilitando auto-merge (squash) en el PR..."
            gh pr merge $Branch --squash --delete-branch --auto
            if ($LASTEXITCODE -ne 0) {
                Write-Host "⚠️ No se pudo habilitar auto-merge. Puede que ya este habilitado o que el repo no lo soporte."
            }
            else {
                Write-Host "✅ Auto-merge habilitado. El PR se mergeara automaticamente cuando CI pase."
            }

            # Step 7: Esperar CI del PR (robusto por PR number, no por branch)
            $prCiOk = Wait-PRRequiredChecksSuccess -PrNumber $prNumber -ContextLabel "$BranchName/ship-pr" -MaxWaitSeconds 1800
            if (-not $prCiOk) {
                Write-Host ""
                Write-Host "╔══════════════════════════════════════════════════════════════╗"
                Write-Host "║  🛑 CI DEL PR HA FALLADO — ACCIÓN OBLIGATORIA DEL AGENTE   ║"
                Write-Host "╠══════════════════════════════════════════════════════════════╣"
                Write-Host "║                                                              ║"
                Write-Host "║  El trabajo NO esta terminado. El agente DEBE:               ║"
                Write-Host "║                                                              ║"
                Write-Host "║  1. Identificar los checks fallidos:                         ║"
                Write-Host "║     gh pr checks $Branch                                     ║"
                Write-Host "║                                                              ║"
                Write-Host "║  2. Diagnosticar y CORREGIR los errores en este worktree.    ║"
                Write-Host "║                                                              ║"
                Write-Host "║  3. Commit + push de las correcciones:                       ║"
                Write-Host "║     git add -A                                               ║"
                Write-Host "║     git commit -m 'fix: corregir CI'                         ║"
                Write-Host "║     git push origin $Branch --force-with-lease               ║"
                Write-Host "║                                                              ║"
                Write-Host "║  4. Volver a ejecutar ship para reintentar:                  ║"
                Write-Host "║     pwsh -File scripts/worktree-manager.ps1 ship ...         ║"
                Write-Host "║                                                              ║"
                Write-Host "║  ⛔ NO terminar la sesion hasta que main CI sea 100% verde  ║"
                Write-Host "╚══════════════════════════════════════════════════════════════╝"
                Write-Host ""
                throw "🛑 CI del PR fallo. El agente DEBE corregir los errores y volver a ejecutar 'ship'. El trabajo NO esta terminado hasta que main CI este 100% verde."
            }

            # Step 8: CI paso — esperar que el auto-merge se complete (PR state = MERGED)
            Write-Host "✅ CI exitoso. Esperando auto-merge del PR..."
            $mergeResult = Wait-PRMerged -Branch $Branch -MaxWaitSeconds 900
            if (-not $mergeResult.Merged) {
                throw "❌ El PR no se mergeo en el tiempo esperado. Verificar estado en GitHub con: gh pr view $Branch"
            }
            Ensure-RemoteBranchDeleted -RepoPath $WorktreePath -BranchName $Branch -ContextLabel "$BranchName/ship-post-merge"

            # NOTE: no fetch directo sobre la rama base local; puede fallar si está checkout.
            # El siguiente 'create' hará fetch de $BaseRef igualmente.

            # Step 9: Esperar CI de main del commit mergeado y limpiar directorio físico local
            Pop-Location  # Salir del worktree ANTES de intentar borrarlo
            $popped = $true
            $mergeCommitSha = "$($mergeResult.MergeCommitSha)"
            if ([string]::IsNullOrWhiteSpace($mergeCommitSha)) {
                Write-Warning "⚠️ No se pudo resolver merge commit del PR. Fallback a verificación global de '$BaseBranch'."
                $ciPassed = Wait-MainCI -MaxWaitSeconds 600
            }
            else {
                $ciPassed = Wait-MainCIForCommit -CommitSha $mergeCommitSha -PrNumber $mergeResult.PrNumber -MaxWaitSeconds 600
            }
            if ($ciPassed) {
                $cleanupDeferred = $false
                Write-Host "🗑️  Eliminando directorio local del worktree: $WorktreePath"
                $removed = Remove-WorktreeDirectoryRobust -WorktreePath $WorktreePath -BranchName $BranchName
                if ($removed) {
                    # Liberar scope lock únicamente cuando la limpieza física fue confirmada
                    Use-AtomicLock {
                        $lkData = Read-ScopeLock
                        $lkData.locks = @($lkData.locks | Where-Object { $_.branch -ne $BranchName })
                        Save-ScopeLock $lkData
                    }
                    Write-Host "🔓 Scope '$Scope' liberado."
                }
                else {
                    Write-Warning "⚠️ Cleanup local pendiente: scope '$Scope' NO se liberó."
                    Write-Warning "   Ejecuta: pwsh -File scripts/worktree-manager.ps1 cleanup $Type $Agent $Scope"
                    $cleanupDeferred = Start-DeferredCleanupJob -WorktreePath $WorktreePath -BranchName $BranchName
                }

                # Step 10: Sincronizar rama base local + build de producción
                # POST-MERGE BUILD RULE (GEMINI.md #17):
                # Garantiza que el repo principal tenga main actualizado y dist/ listo para testear
                Write-Host ""
                Write-Host "🔄 Step 10: Sincronización local no destructiva..."
                $syncOk = Sync-MainLocalNonDestructive -RunBuild
                if (-not $syncOk) {
                    throw "❌ Sync/build de '$BaseBranch' no completado de forma segura tras ship legacy."
                }
                $mainLocalStatus = if ($syncOk) { "✅ Sincronizado" } else { "⚠️ No sincronizado (revisión manual)" }
                $buildLocalStatus = if ($syncOk) { "✅ dist/ actualizado" } else { "⚠️ dist/ pendiente (manual)" }

                Write-Host ""
                Write-Host "═══════════════════════════════════════════"
                Write-Host "🎉 SHIP COMPLETO"
                Write-Host "   Branch $Branch → $BaseBranch (squash-merge)"
                Write-Host "   CI ${BaseBranch}: ✅ PASS"
                Write-Host "   Base local: $mainLocalStatus"
                Write-Host "   Build local: $buildLocalStatus"
                if ($removed) {
                    Write-Host "   Directorio worktree: eliminado"
                    Write-Host "   Scope '$Scope': liberado"
                }
                else {
                    if ($cleanupDeferred) {
                        Write-Host "   Directorio worktree: ⚠️ pending (auto-cleanup diferido programado)"
                    }
                    else {
                        Write-Host "   Directorio worktree: ⚠️ pendiente de cleanup manual"
                    }
                    Write-Host "   Scope '$Scope': ⚠️ retenido hasta cleanup exitoso"
                }
                Write-Host ""
                Write-Host "   🧪 Listo para testear:"
                Write-Host "   Chrome → Load unpacked → $MainRepo\dist\"
                Write-Host "═══════════════════════════════════════════"
            }
            else {
                # Aún en ship parcial, intentar sync + build (el merge ya ocurrió en GitHub)
                Write-Host ""
                Write-Host "🔄 Sincronizando '$BaseBranch' local (best-effort NO destructivo)..."
                $syncOk = Sync-MainLocalNonDestructive -RunBuild
                if (-not $syncOk) {
                    Write-Warning "⚠️ Sync/build local no completado de forma segura. Continuar con revisión manual."
                }

                Write-Host ""
                Write-Host "═══════════════════════════════════════════"
                Write-Host "⚠️  SHIP PARCIAL"
                Write-Host "   Branch $Branch → $BaseBranch (squash-merge OK)"
                Write-Host "   CI ${BaseBranch}: no confirmado (fallo o timeout)"
                Write-Host "   Base local: sincronizado (best-effort)"
                Write-Host "   Directorio local CONSERVADO: $WorktreePath"
                Write-Host "   Ejecuta manualmente cuando CI pase:"
                Write-Host "   pwsh -File scripts/worktree-manager.ps1 cleanup $Type $Agent $Scope"
                Write-Host "═══════════════════════════════════════════"
            }
            # Saltar el Pop-Location del finally (ya lo hicimos arriba)
            return
        }
        finally {
            if (-not $popped) { Pop-Location }
        }
    }

    # ───────────────────────────────────────────────────────────
    # LIST
    # ───────────────────────────────────────────────────────────
    "list" {
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════════╗"
        Write-Host "║               Active Worktrees & Scope Locks               ║"
        Write-Host "╠══════════════════════════════════════════════════════════════╣"

        # Git worktrees
        Push-Location $MainRepo
        try {
            $worktrees = git worktree list --porcelain 2>&1
        }
        finally {
            Pop-Location
        }

        Write-Host "║                                                              ║"
        Write-Host "║  📂 Git Worktrees:                                           ║"

        $wtLines = $worktrees -split "`n" | Where-Object { $_ -match "^worktree " }
        foreach ($line in $wtLines) {
            $path = $line -replace "^worktree ", ""
            if ($path -ne $MainRepo) {
                Write-Host "║    🌳 $path"
            }
        }

        if ($wtLines.Count -le 1) {
            Write-Host "║    (ninguno)"
        }

        # Scope locks
        Write-Host "║                                                              ║"
        Write-Host "║  🔒 Scope Locks:                                             ║"

        $lockData = Read-ScopeLock
        if ($lockData.locks.Count -eq 0) {
            Write-Host "║    (ninguno)"
        }
        else {
            foreach ($lock in $lockData.locks) {
                Write-Host "║    [$($lock.scope)] → $($lock.agent) | $($lock.branch) | $($lock.created)"
            }
        }

        Write-Host "║                                                              ║"
        Write-Host "╚══════════════════════════════════════════════════════════════╝"
        Write-Host ""
    }

    # ───────────────────────────────────────────────────────────
    # CLEANUP
    # ───────────────────────────────────────────────────────────
    "cleanup" {
        Write-Host "🧹 Cleanup local del worktree objetivo..."
        Ensure-GitHubTooling -RepoPath $MainRepo -RequireGh

        Use-AtomicLock {
            $lockData = Read-ScopeLock
            if ($lockData.locks.Count -eq 0) {
                Write-Host "ℹ️ No hay locks activos. Nada para limpiar."
                return
            }

            $target = Resolve-CleanupTargetLock -LockData $lockData
            Write-Host "🎯 Objetivo cleanup: branch '$($target.Branch)' (scope '$($target.Scope)', agent '$($target.Agent)')"
            Write-Host "   Selección: $($target.Source)"

            $remaining = @()
            $cleaned = 0
            $processed = 0

            foreach ($lock in $lockData.locks) {
                $lockPathNorm = Normalize-PathForCompare -Path "$($lock.path)"
                $isTarget = ("$($lock.branch)" -eq $target.Branch) -and ($lockPathNorm -eq $target.PathNorm)
                if (-not $isTarget) {
                    $remaining += $lock
                    continue
                }

                $processed++
                $WorktreePath = $lock.path
                $BranchName = $lock.branch

                # Check if PR was merged
                $prState = gh pr list --head $BranchName --state merged --json number 2>&1 | ConvertFrom-Json

                if ($prState -and $prState.Count -gt 0) {
                    Write-Host "  ✅ $BranchName — PR merged. Verificando CI de main antes de limpiar..."

                    # Verificar CI de main 100% verde antes de eliminar directorio físico
                    $ciOk = Wait-MainCI -MaxWaitSeconds 300
                    if (-not $ciOk) {
                        Write-Warning "  ⚠️ CI de main no confirmado. Conservando $BranchName por seguridad."
                        $remaining += $lock
                        continue
                    }

                    $removed = Remove-WorktreeDirectoryRobust -WorktreePath $WorktreePath -BranchName $BranchName
                    if ($removed) {
                        $cleaned++
                    }
                    else {
                        Write-Warning "  ⚠️ Cleanup pendiente para $BranchName. Conservando lock."
                        $remaining += $lock
                    }
                }
                else {
                    Write-Host "  ⏳ $BranchName — PR no merged aún. Conservando."
                    $remaining += $lock
                }
            }

            if ($processed -eq 0) {
                throw "❌ No se encontró lock objetivo para cleanup. Se preservaron todos los locks."
            }

            # Update lock file
            $lockData.locks = $remaining
            Save-ScopeLock $lockData

            # GC
            Push-Location $MainRepo
            try {
                git worktree prune 2>&1
                git gc --auto 2>&1
            }
            finally {
                Pop-Location
            }

            Write-Host ""
            Write-Host "🧹 Cleanup completado (aislado): $cleaned objetivo(s) removido(s), $($remaining.Count) lock(s) activo(s)."
        }
    }

    "sanitize-main" {
        $sanitized = Invoke-MainLocalAutosanitizeForShip
        if (-not $sanitized) {
            throw "❌ El saneamiento automático de '$BaseBranch' local no quedó confirmado."
        }
    }
}
