function Remove-DirectoryRobust {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return $true
    }

    $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    $isReparsePoint = $false
    if ($null -ne $item) {
        $isReparsePoint = (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
    }

    if ($isReparsePoint) {
        & cmd /c "rmdir `"$Path`""
    }
    else {
        try {
            Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
        }
        catch {
            & cmd /c "rmdir /s /q `"$Path`""
        }
    }

    return (-not (Test-Path $Path))
}
