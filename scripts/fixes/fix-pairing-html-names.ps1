# Fix pairing HTML file names
# Rename select-driver.html to select_driver.html for all drivers

$drivers = Get-ChildItem -Path "drivers" -Directory

$fixed = 0
$errors = 0

foreach ($driver in $drivers) {
    $pairPath = Join-Path $driver.FullName "pair"
    
    if (Test-Path $pairPath) {
        $oldFile = Join-Path $pairPath "select-driver.html"
        $newFile = Join-Path $pairPath "select_driver.html"
        
        if (Test-Path $oldFile) {
            try {
                Rename-Item -Path $oldFile -NewName "select_driver.html" -ErrorAction Stop
                Write-Host "✅ Fixed: $($driver.Name)"
                $fixed++
            } catch {
                Write-Host "❌ Error: $($driver.Name) - $_"
                $errors++
            }
        }
    }
}

Write-Host "`n✨ Complete!"
Write-Host "   ✅ Fixed: $fixed"
Write-Host "   ❌ Errors: $errors"
