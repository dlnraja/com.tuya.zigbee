# REMOVE DUPLICATE LIB FILES - Cleanup Script
# Supprime les fichiers doublons identifiés lors de la consolidation

$ErrorActionPreference = "Stop"

Write-Host "CLEANUP: Removing duplicate lib/ files..." -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$libPath = Join-Path $rootPath "lib"

# Liste des fichiers à supprimer (doublons identifiés)
$filesToRemove = @(
    # Tuya duplicates
    "TuyaDataPointParser.js",          # Doublon de TuyaDPParser.js
    "TuyaSyncManager.js",              # Intégré dans TuyaEF00Manager
    "TuyaTimeSyncManager.js",          # Doublon de TuyaSyncManager
    "TuyaSpecificDevice.js",           # Intégré dans BaseHybridDevice
    "TuyaZigbeeDevice.js",             # Remplacé par BaseHybridDevice
    "IntelligentProtocolRouter.js",    # Fusionné dans TuyaProtocolManager
    
    # Battery duplicates (à consolider plus tard)
    "BatteryCalculator.example.js",    # Fichier exemple
    
    # IAS Zone old versions
    "IASZoneEnroller.js",              # Old version
    "IASZoneEnrollerEnhanced.js",      # Old version  
    "IASZoneEnrollerV4.js",            # Old version
    "IASZoneEnroller_SIMPLE_v4.0.6.js" # Old version
)

$removedCount = 0
$notFoundCount = 0

foreach ($file in $filesToRemove) {
    $filePath = Join-Path $libPath $file
    
    if (Test-Path $filePath) {
        try {
            Remove-Item $filePath -Force
            Write-Host "  [OK] Removed: $file" -ForegroundColor Green
            $removedCount++
        } catch {
            Write-Host "  [ERROR] Failed to remove: $file" -ForegroundColor Red
            Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [WARN] Not found: $file" -ForegroundColor Yellow
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "CLEANUP SUMMARY:" -ForegroundColor Cyan
Write-Host "  Removed: $removedCount files" -ForegroundColor Green
Write-Host "  Not found: $notFoundCount files" -ForegroundColor Yellow
Write-Host "  Total processed: $($filesToRemove.Count) files" -ForegroundColor White
Write-Host ""

# Verify remaining lib/ files
$remainingFiles = Get-ChildItem -Path $libPath -Filter "*.js" | Measure-Object
Write-Host "Remaining lib/*.js files: $($remainingFiles.Count)" -ForegroundColor Cyan

if ($removedCount -gt 0) {
    Write-Host ""
    Write-Host "Cleanup completed successfully!" -ForegroundColor Green
    Write-Host "   Don't forget to commit these changes:" -ForegroundColor Yellow
    Write-Host "   git add -A" -ForegroundColor Gray
    Write-Host "   git commit -m 'Remove duplicate lib files - Consolidation phase 1'" -ForegroundColor Gray
    Write-Host "   git push" -ForegroundColor Gray
} else {
    Write-Host "No files were removed" -ForegroundColor Yellow
}

Write-Host ""
