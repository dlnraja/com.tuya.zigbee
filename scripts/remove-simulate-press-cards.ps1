# Remove all simulate_press flow cards
$flowActionsPath = Join-Path $PSScriptRoot "..\.homeycompose\flow\actions"
Write-Host "Removing simulate_press cards from: $flowActionsPath" -ForegroundColor Yellow

$filesToRemove = @(
    "button_remote_simulate_press.json",
    "scene_controller_simulate_press.json",
    "switch_touch_simulate_press.json",
    "switch_wall_simulate_press.json",
    "switch_wireless_simulate_press.json"
)

foreach ($file in $filesToRemove) {
    $filePath = Join-Path $flowActionsPath $file
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "  Removed: $file" -ForegroundColor Red
    } else {
        Write-Host "  Not found: $file" -ForegroundColor Gray
    }
}

Write-Host "`nDone!" -ForegroundColor Green
