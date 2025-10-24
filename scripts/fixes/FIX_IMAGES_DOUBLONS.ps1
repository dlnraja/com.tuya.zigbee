#!/usr/bin/env pwsh

<#
.SYNOPSIS
Fix image duplicates and clean up assets structure

.DESCRIPTION
Removes duplicate images in assets/images/ folder
Keeps only assets/small.png and assets/large.png (SDK3 requirement)
Ensures each driver has correct image structure
#>

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$DriversPath = Join-Path $ProjectRoot "drivers"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🖼️  FIX IMAGES DOUBLONS - SDK3 COMPLIANCE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Find all driver directories
$drivers = Get-ChildItem -Path $DriversPath -Directory | Where-Object { 
    $_.Name -notlike '.*' -and $_.Name -notlike '_*' 
}

Write-Host "📦 Found $($drivers.Count) drivers to check" -ForegroundColor Yellow
Write-Host ""

$fixed = 0
$issues = 0

foreach ($driver in $drivers) {
    $assetsPath = Join-Path $driver.FullName "assets"
    $imagesSubfolder = Join-Path $assetsPath "images"
    
    # Check if assets/images/ subfolder exists (DUPLICATE)
    if (Test-Path $imagesSubfolder) {
        Write-Host "   ⚠️  $($driver.Name) - Found duplicate images/ subfolder" -ForegroundColor Yellow
        $issues++
        
        # List files in subfolder
        $subfolderFiles = Get-ChildItem -Path $imagesSubfolder -File
        Write-Host "      Files in subfolder: $($subfolderFiles.Count)" -ForegroundColor Gray
        
        # Check if root assets has the required files
        $hasSmall = Test-Path (Join-Path $assetsPath "small.png")
        $hasLarge = Test-Path (Join-Path $assetsPath "large.png")
        
        if ($hasSmall -and $hasLarge) {
            Write-Host "      ✓ Root assets/ has required files, removing subfolder..." -ForegroundColor Green
            Remove-Item -Path $imagesSubfolder -Recurse -Force -ErrorAction SilentlyContinue
            $fixed++
            Write-Host "      ✅ Subfolder removed" -ForegroundColor Green
        }
        else {
            Write-Host "      ⚠️  Root assets/ missing required files, keeping subfolder" -ForegroundColor Yellow
            Write-Host "         Need to copy from subfolder to root first" -ForegroundColor Gray
            
            # Copy from subfolder to root if needed
            if (-not $hasSmall -and (Test-Path (Join-Path $imagesSubfolder "small.png"))) {
                Copy-Item (Join-Path $imagesSubfolder "small.png") (Join-Path $assetsPath "small.png")
                Write-Host "         ✓ Copied small.png to root" -ForegroundColor Cyan
            }
            if (-not $hasLarge -and (Test-Path (Join-Path $imagesSubfolder "large.png"))) {
                Copy-Item (Join-Path $imagesSubfolder "large.png") (Join-Path $assetsPath "large.png")
                Write-Host "         ✓ Copied large.png to root" -ForegroundColor Cyan
            }
            
            # Now remove subfolder
            Remove-Item -Path $imagesSubfolder -Recurse -Force -ErrorAction SilentlyContinue
            $fixed++
            Write-Host "      ✅ Fixed and removed subfolder" -ForegroundColor Green
        }
    }
    
    # Check for xlarge.png (not needed in SDK3)
    $xlargePath = Join-Path $assetsPath "xlarge.png"
    if (Test-Path $xlargePath) {
        Write-Host "   ℹ️  $($driver.Name) - Has xlarge.png (optional)" -ForegroundColor Gray
    }
    
    # Verify required files exist
    $hasSmall = Test-Path (Join-Path $assetsPath "small.png")
    $hasLarge = Test-Path (Join-Path $assetsPath "large.png")
    
    if (-not $hasSmall -or -not $hasLarge) {
        Write-Host "   ❌ $($driver.Name) - Missing required images!" -ForegroundColor Red
        if (-not $hasSmall) { Write-Host "      Missing: small.png" -ForegroundColor Red }
        if (-not $hasLarge) { Write-Host "      Missing: large.png" -ForegroundColor Red }
        $issues++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ IMAGES CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor White
Write-Host "   Fixed: $fixed drivers" -ForegroundColor Green
Write-Host "   Issues found: $issues drivers" -ForegroundColor Yellow
Write-Host "   Total checked: $($drivers.Count) drivers" -ForegroundColor White
Write-Host ""

if ($issues -gt 0) {
    Write-Host "⚠️  Some issues remain - manual intervention may be needed" -ForegroundColor Yellow
}
else {
    Write-Host "✨ All drivers have correct image structure!" -ForegroundColor Green
}
Write-Host ""
