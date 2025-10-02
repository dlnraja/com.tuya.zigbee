Add-Type -AssemblyName System.Drawing

$driversPath = "drivers"
$driverDirs = Get-ChildItem -Path $driversPath -Directory
$fixed = 0

Write-Host "=== Fixing all driver images ===" -ForegroundColor Cyan

foreach ($driverDir in $driverDirs) {
    $driverName = $driverDir.Name
    $assetsDir = Join-Path $driverDir.FullName "assets"
    
    if (-not (Test-Path $assetsDir)) {
        New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
    }
    
    # Fix small.png (75x75)
    $smallPath = Join-Path $assetsDir "small.png"
    $needsSmall = $false
    
    if (-not (Test-Path $smallPath)) {
        $needsSmall = $true
    } else {
        try {
            $img = [System.Drawing.Image]::FromFile($smallPath)
            if ($img.Width -ne 75 -or $img.Height -ne 75) {
                $needsSmall = $true
            }
            $img.Dispose()
        } catch {
            $needsSmall = $true
        }
    }
    
    if ($needsSmall) {
        $bmp = New-Object System.Drawing.Bitmap(75, 75)
        $gfx = [System.Drawing.Graphics]::FromImage($bmp)
        $gfx.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
        $gfx.Dispose()
        $bmp.Save($smallPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "  [FIXED] $driverName/assets/small.png (75x75)" -ForegroundColor Green
        $fixed++
    }
    
    # Fix large.png (500x500) directly in assets/
    $largeDirectPath = Join-Path $assetsDir "large.png"
    $needsLargeDirect = $false
    if (Test-Path $largeDirectPath) {
        try {
            $img = [System.Drawing.Image]::FromFile($largeDirectPath)
            if ($img.Width -ne 500 -or $img.Height -ne 500) {
                $needsLargeDirect = $true
            }
            $img.Dispose()
        } catch {
            $needsLargeDirect = $true
        }
    } else {
        $needsLargeDirect = $true
    }
    if ($needsLargeDirect) {
        $bmp = New-Object System.Drawing.Bitmap(500, 500)
        $gfx = [System.Drawing.Graphics]::FromImage($bmp)
        $gfx.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
        $gfx.Dispose()
        $bmp.Save($largeDirectPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "  [FIXED] $driverName/assets/large.png (500x500)" -ForegroundColor Green
        $fixed++
    }
    
    # Fix large.png (500x500) in assets/images/
    $imagesDir = Join-Path $assetsDir "images"
    if (Test-Path $imagesDir) {
        $largePath = Join-Path $imagesDir "large.png"
        if (Test-Path $largePath) {
            $needsLarge = $false
            try {
                $img = [System.Drawing.Image]::FromFile($largePath)
                if ($img.Width -ne 500 -or $img.Height -ne 500) {
                    $needsLarge = $true
                }
                $img.Dispose()
            } catch {
                $needsLarge = $true
            }
            
            if ($needsLarge) {
                $bmp = New-Object System.Drawing.Bitmap(500, 500)
                $gfx = [System.Drawing.Graphics]::FromImage($bmp)
                $gfx.Clear([System.Drawing.Color]::FromArgb(255, 230, 230, 230))
                $gfx.Dispose()
                $bmp.Save($largePath, [System.Drawing.Imaging.ImageFormat]::Png)
                $bmp.Dispose()
                Write-Host "  [FIXED] $driverName/assets/images/large.png (500x500)" -ForegroundColor Green
                $fixed++
            }
        }
    }
    
    # Remove old small.png from assets/images/ if exists
    $oldSmallPath = Join-Path $imagesDir "small.png"
    if (Test-Path $oldSmallPath) {
        Remove-Item $oldSmallPath -Force
        Write-Host "  [REMOVED] $driverName/assets/images/small.png (conflicting file)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Total drivers processed: $($driverDirs.Count)" -ForegroundColor White
Write-Host "Images fixed: $fixed" -ForegroundColor Green
Write-Host "`nDone!" -ForegroundColor Cyan
