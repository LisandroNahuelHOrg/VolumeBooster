function Get-LegacyMonitorPaths {
    param(
        [string]$Display,
        [string]$TargetPath
    )

    $portableRoot = Get-ManagerDefaultWorktreeRoot
    $legacyDefaults = @(
        $TargetPath
        (Join-Path $portableRoot $Display)
    )

    if ($IsWindows) {
        $legacyDefaults += "D:\SpeedSuite-Trees\$Display"
    }

    return $legacyDefaults | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique
}
