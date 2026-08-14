# ============================================================
# Apply the main.js patch to DSH Desktop (optional)
#
# The DSH Desktop main process creates the pet window but, in the stock build,
# closing the main window does not close the pet window — the pet lingers on
# screen until you quit the whole app another way. This patch makes the pet
# window close together with the main window.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File apply-main-patch.ps1          # apply
#   powershell -ExecutionPolicy Bypass -File apply-main-patch.ps1 -Revert # restore
#   powershell -ExecutionPolicy Bypass -File apply-main-patch.ps1 -DryRun # preview
#
# Requires: the app directory is writable (e.g. a per-user install). If the
# app is installed under "C:\Program Files", run PowerShell as Administrator.
# Restart DSH Desktop after applying.
# ============================================================
param(
    [switch]$Revert,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$AppDir = "D:\Program Files\DSH Desktop\resources\app"
$MainJs = Join-Path $AppDir "main.js"
$Patched = Join-Path $PSScriptRoot "patch\main.js"
$Original = Join-Path $PSScriptRoot "patch\main.js.original"

function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Skip($m) { Write-Host "  [--] $m" -ForegroundColor DarkGray }
function Warn($m) { Write-Host "  [!] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "  [X] $m" -ForegroundColor Red }

if (-not (Test-Path $AppDir)) {
    Fail "app directory not found: $AppDir"
    Fail "edit AppDir at the top of this script to match your install path"
    exit 1
}

$current = ""
if (Test-Path $MainJs) { $current = Get-Content $MainJs -Raw -Encoding UTF8 }
$hasFix = $current.Contains("closing pet window with main window")

if ($DryRun) {
    if ($Revert) {
        Write-Host "  [DryRun] would restore original main.js from: $Original"
    } else {
        if ($hasFix) { Write-Host "  [DryRun] patch already applied, nothing to do" }
        else { Write-Host "  [DryRun] would apply patched main.js from: $Patched" }
    }
    exit 0
}

if ($Revert) {
    Step "Reverting main.js"
    if (-not (Test-Path $Original)) {
        Fail "original main.js not found at $Original"
        exit 1
    }
    if (-not $hasFix) {
        Skip "current main.js does not contain the patch — nothing to revert"
        exit 0
    }
    $bak = "$MainJs.bak-$(Get-Date -Format yyyyMMddHHmmss)"
    Copy-Item $MainJs $bak -Force
    Ok "backed up patched main.js to: $bak"
    Copy-Item $Original $MainJs -Force
    Ok "restored original main.js"
    Warn "restart DSH Desktop to take effect"
    exit 0
}

Step "Applying main.js patch"
if ($hasFix) {
    Skip "patch already applied (main.js contains the pet-close fix)"
    exit 0
}
if (-not (Test-Path $Patched)) {
    Fail "patched main.js not found at $Patched"
    exit 1
}
if (-not (Test-Path $Original)) {
    Fail "original main.js not found at $Original (required for revert)"
    exit 1
}
try {
    $bak = "$MainJs.bak-$(Get-Date -Format yyyyMMddHHmmss)"
    Copy-Item $MainJs $bak -Force
    Ok "backed up current main.js to: $bak"
    Copy-Item $Patched $MainJs -Force
    Ok "applied patched main.js"
    Warn "restart DSH Desktop to take effect"
} catch {
    Fail "could not apply patch: $($_.Exception.Message)"
    Fail "if the app is in Program Files, run PowerShell as Administrator"
    exit 1
}
