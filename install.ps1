# ============================================================
# DeepSeek Whale Girl Pet - one-click installer (Windows)
#
# Installs the whale-girl pet plugin into one or both DSH profiles:
#   1. Desktop pet  (DSH Desktop / Electron) -> %APPDATA%\dsh-desktop-client\dsh\profiles\web
#   2. Web pet      (dsh --profile web)      -> %USERPROFILE%\.dsh\profiles\web
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File install.ps1              # install to both
#   powershell -ExecutionPolicy Bypass -File install.ps1 -Target desktop
#   powershell -ExecutionPolicy Bypass -File install.ps1 -Target web
#   powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall  # remove from both
#   powershell -ExecutionPolicy Bypass -File install.ps1 -DryRun     # preview only
#
# After install, restart DSH Desktop / the dsh web service to load the plugin.
# ============================================================
param(
    [ValidateSet("desktop", "web", "all")]
    [string]$Target = "all",
    [switch]$Uninstall,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$PluginSrc = Join-Path $PSScriptRoot "plugin\dsh-balance-widget"
$PluginName = "dsh-balance-widget"

$Profiles = @{
    desktop = @{ Label = "Desktop (DSH Desktop)"; Profile = Join-Path $env:APPDATA "dsh-desktop-client\dsh\profiles\web" }
    web     = @{ Label = "Web (dsh --profile web)"; Profile = Join-Path $env:USERPROFILE ".dsh\profiles\web" }
}

$SelectedTargets = @()
foreach ($key in @("desktop", "web")) {
    if ($Target -eq "all" -or $Target -eq $key) {
        $SelectedTargets += $Profiles[$key]
    }
}

function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Skip($m) { Write-Host "  [--] $m" -ForegroundColor DarkGray }
function Warn($m) { Write-Host "  [!] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "  [X] $m" -ForegroundColor Red }

if (-not (Test-Path (Join-Path $PluginSrc "package.json"))) {
    Fail "plugin package not found at $PluginSrc"
    Fail "keep install.ps1 next to the plugin\ folder"
    exit 1
}

$insertBlock = @"
# DeepSeek whale-girl pet + balance badge (dsh-balance-widget)
- insert:
    - id: balance-widget
      name: 'dsh-balance-widget'
"@

# Remove our insert block from a patch file by line-scanning: we only drop the
# `- insert:` block whose immediate child is `- id: balance-widget`, so other
# plugins' entries are never touched.
function Remove-BalanceWidgetBlock([string]$content) {
    $lines = $content -split "\r?\n"
    $out = New-Object System.Collections.Generic.List[string]
    $removedAny = $false
    $skip = $false

    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]

        if ($skip) {
            # skip every line of the removed block: it is indented under the
            # `- insert:` we already dropped, or blank. Stop at a top-level item
            # (no leading whitespace) or a top-level "- " list item.
            if ($line -match '^\s*$' -or $line -match '^\s') {
                continue
            }
            $skip = $false
        }

        if ($line -match '^\s*- insert:\s*$') {
            $j = $i + 1
            while ($j -lt $lines.Length -and $lines[$j].Trim() -eq "") { $j++ }
            if ($j -lt $lines.Length -and $lines[$j] -match '^\s+- id: balance-widget\s*$') {
                $removedAny = $true
                $skip = $true
                continue
            }
        }

        $out.Add($line)
    }

    return @{ Text = ($out -join "`r`n"); Removed = $removedAny }
}

# ---------- uninstall ----------
if ($Uninstall) {
    foreach ($t in $SelectedTargets) {
        $prof  = $t.Profile
        $pdir  = Join-Path $prof "node_modules\$PluginName"
        $patch = Join-Path $prof "cordis.patch.yml"

        if ($DryRun) {
            Write-Host "  [DryRun] would delete: $pdir"
            Write-Host "  [DryRun] would patch:   $patch"
            continue
        }

        Step "Uninstalling $($t.Label)"
        if (Test-Path $pdir) {
            try {
                Remove-Item $pdir -Recurse -Force
                Ok "removed plugin: $pdir"
            } catch {
                Fail "could not remove plugin: $($_.Exception.Message)"
            }
        } else {
            Skip "plugin dir absent, skip"
        }

        if (Test-Path $patch) {
            $content = Get-Content $patch -Raw -Encoding UTF8
            $result = Remove-BalanceWidgetBlock $content
            if ($result.Removed) {
                $new = $result.Text.TrimEnd()
                # If nothing (or only comments) remains, the file would no
                # longer be a top-level YAML array — DSH requires that. Restore
                # the default empty-patch template (comment header + "[]").
                $hasArrayItem = $false
                foreach ($ln in ($new -split "\r?\n")) {
                    $t = $ln.Trim()
                    if ($t -ne "" -and -not $t.StartsWith("#")) {
                        $hasArrayItem = $true
                        break
                    }
                }
                if (-not $hasArrayItem) {
                    $new = "# Your patch layer for this dsh profile, applied after every bundle layer:`r`n# a top-level YAML array of loader patch entries (id-targeted config`r`n# overrides, disables, and insert lists; ``!!js`` expressions allowed).`r`n[]"
                }
                Set-Content $patch $new -Encoding UTF8 -NoNewline
                Ok "removed balance-widget from $patch"
            } else {
                Skip "balance-widget not in patch, skip"
            }
        }
    }
    Write-Host "`nUninstall done. Restart DSH Desktop / dsh web." -ForegroundColor Green
    exit 0
}

# ---------- install ----------
foreach ($t in $SelectedTargets) {
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

    if (-not (Test-Path $nm)) {
        New-Item -ItemType Directory -Force -Path $nm | Out-Null
        Ok "created node_modules"
    }

    if (Test-Path $pdir) {
        $bak = "$pdir.bak-$(Get-Date -Format yyyyMMddHHmmss)"
        try {
            Copy-Item $pdir $bak -Recurse -Force
            Ok "backed up old plugin to: $bak"
            Remove-Item $pdir -Recurse -Force
        } catch {
            Fail "could not back up old plugin: $($_.Exception.Message)"
        }
    }

    try {
        Copy-Item $PluginSrc $pdir -Recurse -Force
        Ok "plugin copied to: $pdir"
    } catch {
        Fail "could not copy plugin: $($_.Exception.Message)"
        continue
    }

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
        # Remove a bare "[]" placeholder line, then append our insert block.
        # NOTE: line-by-line scan, NOT -replace without Multiline — the default
        # profile's patch file starts with comment lines before "[]", so an
        # anchored whole-string regex would miss it and leave an invalid
        # "[] ... - insert:" document behind.
        $lines = $patchContent -split "\r?\n" | Where-Object { $_.Trim() -ne '[]' }
        $patchContent = $lines -join "`r`n"
        $patchContent = $patchContent.TrimEnd()
        if ($patchContent.Length -gt 0) { $patchContent += "`r`n`r`n" }
        $patchContent += $insertBlock
        Set-Content $patch $patchContent -Encoding UTF8 -NoNewline
        # Verify the resulting patch: pure-PowerShell structural check (no
        # python/pyyaml dependency — avoids crashing under $ErrorActionPreference
        # "Stop" when python exists but pyyaml is missing).
        $raw = Get-Content $patch -Raw -Encoding UTF8
        # valid: no leftover "[]" placeholder, and our insert block is present
        $yamlOk = (-not ($raw -match '(?m)^\s*\[\]\s*$')) -and ($raw -match '(?m)^\s*- insert:')
        if ($yamlOk) {
            Ok "balance-widget enabled in $patch (structure verified)"
        } else {
            Fail "cordis.patch.yml may be invalid after edit!"
            if (Test-Path $bak) {
                Copy-Item $bak $patch -Force
                Fail "restored previous patch from backup: $bak"
            }
        }
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
