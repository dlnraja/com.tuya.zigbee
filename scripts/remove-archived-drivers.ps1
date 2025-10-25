# Remove all archived drivers (folders starting with .)
$driversPath = Join-Path $PSScriptRoot "..\drivers"
Write-Host "🗑️  Removing archived drivers from: $driversPath" -ForegroundColor Yellow

$archivedDrivers = Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like ".*" }

Write-Host "`nFound $($archivedDrivers.Count) archived drivers:`n" -ForegroundColor Cyan

foreach ($driver in $archivedDrivers) {
    Write-Host "  🗑️  Removing: $($driver.Name)" -ForegroundColor Red
    Remove-Item -Path $driver.FullName -Recurse -Force
}

Write-Host "`n✅ Done! Removed $($archivedDrivers.Count) archived drivers`n" -ForegroundColor Green
