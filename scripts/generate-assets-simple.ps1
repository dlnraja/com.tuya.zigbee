# Generate missing device assets
$DriversPath = Join-Path $PSScriptRoot "..\drivers"

Write-Host "Generating missing device assets..." -ForegroundColor Cyan

# SVG template
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" /><stop offset="100%" style="stop-color:#FF8555;stop-opacity:1" /></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#g1)" stroke="#FF6B35" stroke-width="2"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle" fill="white">Z</text></svg>'

$drivers = Get-ChildItem -Path $DriversPath -Directory
foreach ($driver in $drivers) {
    $name = $driver.Name
    $assets = Join-Path $driver.FullName "assets"
    $images = Join-Path $assets "images"
    
    # Create directories
    if (!(Test-Path $assets)) { New-Item -Path $assets -ItemType Directory -Force | Out-Null }
    if (!(Test-Path $images)) { New-Item -Path $images -ItemType Directory -Force | Out-Null }
    
    # Create icon.svg
    $iconPath = Join-Path $assets "icon.svg"
    if (!(Test-Path $iconPath)) {
        Write-Host "  Creating icon.svg for $name" -ForegroundColor Yellow
        $svg | Out-File -FilePath $iconPath -Encoding UTF8
    }
    
    # Create placeholder PNGs by copying from main assets if they exist
    $smallPng = Join-Path $images "small.png"
    $largePng = Join-Path $images "large.png"
    
    $mainSmall = "C:\Users\HP\Desktop\tuya_repair\assets\images\small.png"
    $mainLarge = "C:\Users\HP\Desktop\tuya_repair\assets\images\large.png"
    
    if (!(Test-Path $smallPng) -and (Test-Path $mainSmall)) {
        Copy-Item -Path $mainSmall -Destination $smallPng
        Write-Host "  Copied small.png for $name" -ForegroundColor Green
    }
    
    if (!(Test-Path $largePng) -and (Test-Path $mainLarge)) {
        Copy-Item -Path $mainLarge -Destination $largePng
        Write-Host "  Copied large.png for $name" -ForegroundColor Green
    }
}

Write-Host "Asset generation completed!" -ForegroundColor Green
