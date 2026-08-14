# ============================================================
# DeepSeek Whale Girl Pet - one-click installer (Windows)
#
# Installs into:
#   1. Desktop pet  (DSH Desktop / Electron)
#   2. Web pet      (dsh --profile web, browser UI)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File install.ps1            # install
#   powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall # uninstall
#   powershell -ExecutionPolicy Bypass -File install.ps1 -DryRun    # preview
# ============================================================
param(
    [switch]$Uninstall,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$PluginSrc = Join-Path $PSScriptRoot "plugin\dsh-balance-widget"
$PluginName = "dsh-balance-widget"

$Targets = @(
    @{ Label = "Desktop (DSH Desktop)"; Profile = Join-Path $env:APPDATA "dsh-desktop-client\dsh\profiles\web" },
    @{ Label = "Web (dsh --profile web)"; Profile = Join-Path $env:USERPROFILE ".dsh\profiles\web" }
)

function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Skip($m) { Write-Host "  [--] $m" -ForegroundColor DarkGray }
function Warn($m) { Write-Host "  [!] $m" -ForegroundColor Yellow }

if (-not (Test-Path (Join-Path $PluginSrc "package.json"))) {
    Write-Host "ERROR: plugin package not found at $PluginSrc" -ForegroundColor Red
    Write-Host "Keep install.ps1 next to the plugin\ folder." -ForegroundColor Red
    exit 1
}

$insertBlock = @"
# DeepSeek whale-girl pet + balance badge (dsh-balance-widget)
- insert:
    - id: balance-widget
      name: 'dsh-balance-widget'
"@

# ---------- uninstall ----------
if ($Uninstall) {
    foreach ($t in $Targets) {
        $prof  = $t.Profile
        $pdir  = Join-Path $prof "node_modules\$PluginName"
        $patch = Join-Path $prof "cordis.patch.yml"

        if ($DryRun) {
            Write-Host "[DryRun] would delete: $pdir"
            Write-Host "[DryRun] would patch:   $patch"
            continue
        }

        Step "Uninstalling $($t.Label)"
        if (Test-Path $pdir) {
            Remove-Item $pdir -Recurse -Force
            Ok "removed plugin: $pdir"
        } else { Skip "plugin dir absent, skip" }

        if (Test-Path $patch) {
            $c = Get-Content $patch -Raw -Encoding UTF8
            # remove our insert block (id: balance-widget)
            $lines = $c -split "`r?`n"
            $out = @()
            $skip = $false
            foreach ($ln in $lines) {
                if ($ln -match 'id: balance-widget') { $skip = $true; continue }
                if ($skip) {
                    if ($ln -match '^\s*- ') { $skip = $false }  # next top-level item
                    continue
                }
                $out += $ln
            }
            $new = ($out -join "`r`n").TrimEnd()
            if ($new -ne $c.TrimEnd()) {
                Set-Content $patch $new -Encoding UTF8 -NoNewline
                Ok "removed balance-widget from $patch"
            } else { Skip "balance-widget not in patch, skip" }
        }
    }
    Write-Host "`nUninstall done. Restart DSH Desktop / dsh web." -ForegroundColor Green
    exit 0
}

# ---------- install ----------
foreach ($t in $Targets) {
    $prof  = $t.Profile
    $nm    = Join-Path $prof "node_modules"
    $pdir  = Join-Path $nm $PluginName
    $patch = Join-Path $prof "cordis.patch.yml"

    Step "Installing to $($t.Label)"
    Write-Host "  target: $prof"

    if ($DryRun) {
        Write-Host "  [DryRun] would copy plugin to: $pdir"
        Write-Host "  [DryRun] would enable in:      $patch"
        continue
    }

    if (-not (Test-Path $nm)) { New-Item -ItemType Directory -Force -Path $nm | Out-Null; Ok "created node_modules" }
    if (Test-Path $pdir) {
        $bak = "$pdir.bak-$(Get-Date -Format yyyyMMddHHmmss)"
        Copy-Item $pdir $bak -Recurse -Force
        Ok "backed up old plugin to: $bak"
        Remove-Item $pdir -Recurse -Force
    }
    Copy-Item $PluginSrc $pdir -Recurse -Force
    Ok "plugin copied to: $pdir"

    $patchContent = ""
    if (Test-Path $patch) { $patchContent = Get-Content $patch -Raw -Encoding UTF8 }

    if ($patchContent -match 'id: balance-widget') {
        Ok "balance-widget already enabled in patch"
    } else {
        if (Test-Path $patch) {
            $bak = "$patch.bak-$(Get-Date -Format yyyyMMddHHmmss)"
            Copy-Item $patch $bak -Force
            Ok "patch backed up to: $bak"
        }
        # strip a bare "[]" placeholder, then append our insert block
        $patchContent = $patchContent -replace '^\s*\[\]\s*$', ''
        $patchContent = $patchContent.TrimEnd()
        if ($patchContent.Length -gt 0) { $patchContent += "`r`n`r`n" }
        $patchContent += $insertBlock
        Set-Content $patch $patchContent -Encoding UTF8 -NoNewline
        Ok "balance-widget enabled in $patch"
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Install complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  1. Restart DSH Desktop  -> whale-girl pet window appears bottom-right"
Write-Host "  2. Restart dsh web      -> floating pet appears in the browser UI"
Write-Host ""
Write-Host "Tips:" -ForegroundColor Yellow
Write-Host "  Desktop: drag anywhere / click hat = poke / long-press = headpat"
Write-Host "           double-click hat = mute / right-click hat = menu"
Write-Host "  Web:     drag the whale-girl to move / click X to hide"
Write-Host ""
