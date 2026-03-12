function Invoke-FixedMonitorRepair {
    param(
        [string]$RepoRoot,
        [string]$WorktreeRoot,
        [string[]]$MonitorKeys,
        $Definitions
    )

    $repoFull = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd("\")
    New-Item -ItemType Directory -Path $WorktreeRoot -Force | Out-Null
    & git -C $RepoRoot worktree prune 2>$null | Out-Null
    $registry = Get-WorktreeRegistry -RepoRoot $RepoRoot

    foreach ($rawKey in $MonitorKeys) {
        $monitorKey = "$rawKey".Trim().ToLowerInvariant().Replace("_", "-")
        if (-not $Definitions.Contains($monitorKey)) { continue }
        $definition = $Definitions[$monitorKey]
        $targetPath = $definition.path
        $targetFull = [System.IO.Path]::GetFullPath($targetPath).TrimEnd("\")
        New-Item -ItemType Directory -Path (Split-Path $targetPath -Parent) -Force | Out-Null
        $entry = @($registry | Where-Object BranchName -eq $definition.branch | Select-Object -First 1)

        if ($entry) {
            $sourcePath = $entry.Path
            $sourceFull = [System.IO.Path]::GetFullPath($sourcePath).TrimEnd("\")
            if ($sourceFull -eq $targetFull -and (Test-Path $sourcePath)) { continue }
            if ($entry.Prunable -or -not (Test-Path $sourcePath)) { & git -C $RepoRoot worktree prune 2>$null | Out-Null; $registry = Get-WorktreeRegistry -RepoRoot $RepoRoot; continue }
            $sourceRoot = Get-PathGitTopLevel -Path $sourcePath
            if (-not $sourceRoot) { throw "❌ '$sourcePath' ya no es un worktree válido. Ejecutar limpieza manual." }
            Assert-ManagedPathIsNotForeignRepo -PathUnderCheck $sourcePath -RepoRoot $RepoRoot
            $state = Test-WorktreeClean -Path $sourcePath
            if (-not $state.IsClean) { throw "❌ '$sourcePath' no está listo para migrarse: $($state.Reason)" }
            if ((Test-Path $targetPath) -and $sourceFull -ne $targetFull) { throw "❌ El destino '$targetPath' ya existe. Resolver manualmente." }
            & git -C $RepoRoot worktree move $sourcePath $targetPath 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "❌ No se pudo mover '$sourcePath' a '$targetPath'." }
            & git -C $RepoRoot worktree repair $targetPath 2>&1 | Out-Null
            $registry = Get-WorktreeRegistry -RepoRoot $RepoRoot
            continue
        }

        foreach ($candidate in (Get-LegacyMonitorPaths -Display $definition.display -TargetPath $targetPath)) {
            if (-not (Test-Path $candidate)) { continue }
            $candidateFull = [System.IO.Path]::GetFullPath($candidate).TrimEnd("\")
            $candidateRoot = Get-PathGitTopLevel -Path $candidate
            if (-not $candidateRoot) { throw "❌ '$candidate' existe pero no es un worktree reparable. Resolver manualmente." }
            try {
                Assert-ManagedPathIsNotForeignRepo -PathUnderCheck $candidate -RepoRoot $RepoRoot
            }
            catch {
                if ($candidateFull -eq $targetFull) {
                    throw
                }

                continue
            }
            if ((& git -C $candidate branch --show-current | Out-String).Trim() -ne $definition.branch) { throw "❌ '$candidate' usa una rama distinta a '$($definition.branch)'." }
            $state = Test-WorktreeClean -Path $candidate
            if (-not $state.IsClean) { throw "❌ '$candidate' no está listo para migrarse: $($state.Reason)" }
            & git -C $RepoRoot worktree repair $candidate 2>&1 | Out-Null
            if ([System.IO.Path]::GetFullPath($candidate).TrimEnd("\") -ne $targetFull) {
                if (Test-Path $targetPath) { throw "❌ El destino '$targetPath' ya existe. Resolver manualmente." }
                & git -C $RepoRoot worktree move $candidate $targetPath 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "❌ No se pudo mover '$candidate' a '$targetPath'." }
                & git -C $RepoRoot worktree repair $targetPath 2>&1 | Out-Null
            }
            $registry = Get-WorktreeRegistry -RepoRoot $RepoRoot
            break
        }
    }
}
