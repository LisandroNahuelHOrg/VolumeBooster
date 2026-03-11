function Resolve-CoreInstallPath {
    $coreInstallOverride = "$($env:WORKTREE_MANAGER_CORE_INSTALL)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($coreInstallOverride)) {
        if (-not [System.IO.Path]::IsPathRooted($coreInstallOverride)) {
            throw "❌ WORKTREE_MANAGER_CORE_INSTALL debe ser una ruta absoluta."
        }

        return [System.IO.Path]::GetFullPath($coreInstallOverride).TrimEnd("\", "/")
    }

    $homeDirectory = @(
        "$($env:USERPROFILE)".Trim(),
        "$($env:HOME)".Trim()
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and [System.IO.Path]::IsPathRooted($_) } | Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($homeDirectory)) {
        $homeDirectory = [Environment]::GetFolderPath("UserProfile")
    }

    if ([string]::IsNullOrWhiteSpace($homeDirectory)) {
        throw "❌ No se pudo resolver el home del usuario para instalar worktree-manager."
    }

    $homeRoot = [System.IO.Path]::GetFullPath($homeDirectory).TrimEnd("\", "/")
    return (Join-Path (Join-Path (Join-Path $homeRoot ".codex") "tools") "worktree-manager")
}
