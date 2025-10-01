Add-Type -AssemblyName System.Drawing

$driversPath = "drivers"
$driverDirs = Get-ChildItem -Path $driversPath -Directory
$created = 0

Write-Host "=== Generating 75x75 icons for ALL drivers ===" -ForegroundColor Cyan

foreach ($driverDir in $driverDirs) {
    $driverName = $driverDir.Name
    $assetsDir = Join-Path $driverDir.FullName "assets"
    
    if (-not (Test-Path $assetsDir)) {
        New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
    }
    
    $smallPath = Join-Path $assetsDir "small.png"
    
    # Always regenerate to ensure 75x75
    $bmp = New-Object System.Drawing.Bitmap(75, 75)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
    $gfx.Dispose()
    $bmp.Save($smallPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    Write-Host "  [OK] $driverName" -ForegroundColor Green
    $created++
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Total drivers: $($driverDirs.Count)" -ForegroundColor White
Write-Host "Icons created: $created" -ForegroundColor Green
