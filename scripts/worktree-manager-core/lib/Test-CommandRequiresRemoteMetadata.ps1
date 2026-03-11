function Test-CommandRequiresRemoteMetadata {
    param([string]$Command)

    return $Command -in @(
        "create",
        "ship",
        "fixed-open",
        "fixed-ship",
        "fixed-ship-all",
        "cleanup",
        "sanitize-main"
    )
}
