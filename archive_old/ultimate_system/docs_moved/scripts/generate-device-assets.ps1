# Generate missing device assets for Ultimate Zigbee Hub
# Creates professional icons following Johan Benz standards

$DriversPath = Join-Path $PSScriptRoot "..\drivers"
$AssetsPath = Join-Path $PSScriptRoot "..\assets"

# SVG template for device icons
$iconSvgTemplate = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF8555;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#grad1)" stroke="#FF6B35" stroke-width="2"/>
  <text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle" fill="white">Z</text>
</svg>
'@

Write-Host "🎨 Generating missing device assets..." -ForegroundColor Cyan

# Get all driver directories
$drivers = Get-ChildItem -Path $DriversPath -Directory

foreach ($driver in $drivers) {
    $driverName = $driver.Name
    $imagesPath = Join-Path $driver.FullName "assets\images"
    $assetsPath = Join-Path $driver.FullName "assets"
    
    # Create directories if they don't exist
    if (-not (Test-Path $assetsPath)) {
        New-Item -Path $assetsPath -ItemType Directory -Force | Out-Null
    }
    if (-not (Test-Path $imagesPath)) {
        New-Item -Path $imagesPath -ItemType Directory -Force | Out-Null
    }
    
    # Create icon.svg if missing
    $iconPath = Join-Path $assetsPath "icon.svg"
    if (-not (Test-Path $iconPath)) {
        Write-Host "  Creating icon.svg for $driverName" -ForegroundColor Yellow
        $iconSvgTemplate | Out-File -FilePath $iconPath -Encoding UTF8
    }
    
    # Create placeholder PNGs if missing
    $smallPngPath = Join-Path $imagesPath "small.png"
    $largePngPath = Join-Path $imagesPath "large.png"
    
    if (-not (Test-Path $smallPngPath)) {
        Write-Host "  Creating small.png for $driverName" -ForegroundColor Yellow
        # Create a simple placeholder (75x75 transparent PNG)
        Copy-Item -Path "$AssetsPath\images\small.png" -Destination $smallPngPath -ErrorAction SilentlyContinue
    }
    
    if (-not (Test-Path $largePngPath)) {
        Write-Host "  Creating large.png for $driverName" -ForegroundColor Yellow
        # Create a simple placeholder (500x500 transparent PNG)
        Copy-Item -Path "$AssetsPath\images\large.png" -Destination $largePngPath -ErrorAction SilentlyContinue
    }
}

Write-Host "✅ Asset generation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Note: Placeholder images have been created. For production:" -ForegroundColor Cyan
Write-Host "   - Replace with professional device-specific icons" -ForegroundColor White
Write-Host "   - Use consistent styling following Johan Benz standards" -ForegroundColor White
Write-Host "   - Ensure small.png is 75x75px and large.png is 500x500px" -ForegroundColor White
