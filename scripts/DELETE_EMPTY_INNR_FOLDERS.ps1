# Delete empty Innr driver folders

$foldersToDelete = @(
    "drivers\innr_bulb_tunable_white_ac",
    "drivers\innr_bulb_white_ac",
    "drivers\innr_smart_plug_ac"
)

foreach ($folder in $foldersToDelete) {
    $fullPath = Join-Path $PSScriptRoot "..\$folder"
    if (Test-Path $fullPath) {
        Remove-Item -Path $fullPath -Recurse -Force
        Write-Host "✅ Deleted: $folder"
    } else {
        Write-Host "⏭️  Not found: $folder"
    }
}

Write-Host "`n✅ Empty Innr folders cleaned"
