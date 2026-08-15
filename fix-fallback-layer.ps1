# 修复 dsh profiles/node_modules 回退层被 pnpm hoisted 污染的问题
# 用法（管理员 PowerShell，DSH Desktop 需先关闭）：
#   powershell -ExecutionPolicy Bypass -File fix-fallback-layer.ps1
# 作用：把 profiles/node_modules 里所有"非符号链接"的真实条目移入备份目录，
#       让 dsh 下次启动时重建符号链接层。备份可删除。

$ErrorActionPreference = 'Stop'
$fb = "$env:APPDATA\dsh-desktop-client\dsh\profiles\node_modules"
$bak = "$env:APPDATA\dsh-desktop-client\dsh\profiles\node_modules.real-backup"

if (-not (Test-Path $fb)) { Write-Host "fallback dir not found: $fb"; exit 1 }
New-Item -ItemType Directory -Force -Path $bak | Out-Null

$real = Get-ChildItem $fb | Where-Object { $_.LinkType -eq $null }
if (-not $real) { Write-Host "clean: no real entries found"; exit 0 }

Write-Host "moving $($real.Count) real entries to $bak :"
foreach ($item in $real) {
    $target = Join-Path $bak $item.Name
    # 避免备份目录已有同名（上一次运行残留）
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Move-Item -Path $item.FullName -Destination $target
    Write-Host "  moved: $($item.Name)"
}
Write-Host "done. Now restart DSH Desktop - it will rebuild the symlink layer."
