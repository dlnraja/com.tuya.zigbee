$appJsonPath = ".homeybuild\app.json"
if (Test-Path $appJsonPath) {
    $app = Get-Content $appJsonPath -Raw | ConvertFrom-Json
    $driver = $app.drivers | Where-Object { $_.id -eq "air_quality_monitor_ac" } | Select-Object -First 1
    Write-Host "Driver air_quality_monitor_ac images config:"
    $driver.images | ConvertTo-Json
    Write-Host "`nFull driver object (first 500 chars):"
    ($driver | ConvertTo-Json -Depth 5).Substring(0, [Math]::Min(500, ($driver | ConvertTo-Json -Depth 5).Length))
} else {
    Write-Host "No .homeybuild/app.json found"
}
