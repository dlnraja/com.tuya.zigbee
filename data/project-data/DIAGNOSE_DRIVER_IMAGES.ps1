# ============================================================================
# DIAGNOSE_DRIVER_IMAGES.ps1
# ============================================================================
# Description: Diagnostic approfondi des chemins d'images dans les drivers
# Author: Universal Tuya Zigbee Project
# Version: 1.0.0
# Date: 2025-01-15
# ============================================================================

param(
    [switch]$Verbose = $false,
    [switch]$FixIssues = $false,
    [switch]$ExportReport = $true
)

# Configuration
$projectRoot = Split-Path -Parent $PSScriptRoot
$driversPath = Join-Path $projectRoot "drivers"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $PSScriptRoot "IMAGE_DIAGNOSTIC_REPORT_$timestamp.json"

Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         DIAGNOSTIC PROFOND DES IMAGES DE DRIVERS                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Statistiques
$stats = @{
    totalDrivers = 0
    driversWithImages = 0
    driversWithoutImages = 0
    totalImageReferences = 0
    validImages = 0
    missingImages = 0
    invalidPaths = 0
    issues = @()
}

# Résultats détaillés
$results = @{
    timestamp = $timestamp
    drivers = @()
}

# Fonction: Vérifier chemin d'image
function Test-ImagePath {
    param(
        [string]$ImagePath,
        [string]$DriverPath
    )
    
    $result = @{
        originalPath = $ImagePath
        resolvedPath = ""
        exists = $false
        isValid = $false
        issue = ""
    }
    
    # Nettoyer le chemin
    $cleanPath = $ImagePath -replace '^\./', '' -replace '^/', ''
    
    # Construire le chemin complet
    if ($ImagePath -match '^\./') {
        # Chemin relatif au driver
        $fullPath = Join-Path $DriverPath $cleanPath
    } elseif ($ImagePath -match '^/drivers/') {
        # Chemin absolu depuis la racine du projet
        $fullPath = Join-Path $projectRoot ($ImagePath -replace '^/', '')
    } else {
        # Chemin relatif simple
        $fullPath = Join-Path $DriverPath $cleanPath
    }
    
    $result.resolvedPath = $fullPath
    
    # Vérifier existence
    if (Test-Path $fullPath) {
        $result.exists = $true
        $result.isValid = $true
    } else {
        $result.exists = $false
        $result.issue = "File does not exist: $fullPath"
    }
    
    return $result
}

# Fonction: Analyser driver.compose.json
function Analyze-DriverImages {
    param([string]$DriverPath)
    
    $driverName = Split-Path -Leaf $DriverPath
    $composeFile = Join-Path $DriverPath "driver.compose.json"
    
    if (-not (Test-Path $composeFile)) {
        return $null
    }
    
    $stats.totalDrivers++
    
    $driverInfo = @{
        name = $driverName
        path = $DriverPath
        composeFile = $composeFile
        images = @{
            small = $null
            large = $null
            xlarge = $null
        }
        learnmodeImage = $null
        assetsFolder = $null
        issues = @()
        status = "OK"
    }
    
    try {
        $json = Get-Content $composeFile -Raw | ConvertFrom-Json
        
        # Vérifier assets folder
        $assetsPath = Join-Path $DriverPath "assets"
        $driverInfo.assetsFolder = @{
            path = $assetsPath
            exists = Test-Path $assetsPath
            files = @()
        }
        
        if ($driverInfo.assetsFolder.exists) {
            $driverInfo.assetsFolder.files = Get-ChildItem $assetsPath -File | 
                Select-Object Name, Length, @{Name='RelativePath';Expression={"./assets/$($_.Name)"}}
        }
        
        # Analyser images principales
        if ($json.images) {
            $stats.driversWithImages++
            
            if ($json.images.small) {
                $stats.totalImageReferences++
                $result = Test-ImagePath -ImagePath $json.images.small -DriverPath $DriverPath
                $driverInfo.images.small = $result
                
                if ($result.isValid) { $stats.validImages++ } else { 
                    $stats.missingImages++
                    $driverInfo.issues += "Missing small image: $($json.images.small)"
                }
            }
            
            if ($json.images.large) {
                $stats.totalImageReferences++
                $result = Test-ImagePath -ImagePath $json.images.large -DriverPath $DriverPath
                $driverInfo.images.large = $result
                
                if ($result.isValid) { $stats.validImages++ } else { 
                    $stats.missingImages++
                    $driverInfo.issues += "Missing large image: $($json.images.large)"
                }
            }
            
            if ($json.images.xlarge) {
                $stats.totalImageReferences++
                $result = Test-ImagePath -ImagePath $json.images.xlarge -DriverPath $DriverPath
                $driverInfo.images.xlarge = $result
                
                if ($result.isValid) { $stats.validImages++ } else { 
                    $stats.missingImages++
                    $driverInfo.issues += "Missing xlarge image: $($json.images.xlarge)"
                }
            }
        } else {
            $stats.driversWithoutImages++
            $driverInfo.issues += "No images section in driver.compose.json"
        }
        
        # Analyser learnmode image
        if ($json.zigbee.learnmode.image) {
            $stats.totalImageReferences++
            $result = Test-ImagePath -ImagePath $json.zigbee.learnmode.image -DriverPath $DriverPath
            $driverInfo.learnmodeImage = $result
            
            if ($result.isValid) { $stats.validImages++ } else { 
                $stats.missingImages++
                $driverInfo.issues += "Missing learnmode image: $($json.zigbee.learnmode.image)"
            }
        }
        
        # Déterminer status
        if ($driverInfo.issues.Count -gt 0) {
            $driverInfo.status = "ISSUES"
            $stats.issues += $driverInfo.issues
        }
        
    } catch {
        $driverInfo.issues += "Error parsing JSON: $_"
        $driverInfo.status = "ERROR"
    }
    
    return $driverInfo
}

# Scanner tous les drivers
Write-Host "🔍 Scanning drivers directory..." -ForegroundColor Yellow
$driverFolders = Get-ChildItem $driversPath -Directory

$progressCount = 0
foreach ($driverFolder in $driverFolders) {
    $progressCount++
    $percent = [math]::Round(($progressCount / $driverFolders.Count) * 100)
    
    Write-Progress -Activity "Analyzing drivers" -Status "$progressCount/$($driverFolders.Count)" -PercentComplete $percent
    
    $analysis = Analyze-DriverImages -DriverPath $driverFolder.FullName
    
    if ($analysis) {
        $results.drivers += $analysis
        
        if ($Verbose -and $analysis.issues.Count -gt 0) {
            Write-Host "  ⚠️  $($analysis.name): $($analysis.issues.Count) issue(s)" -ForegroundColor Yellow
        }
    }
}

Write-Progress -Activity "Analyzing drivers" -Completed

# Résumé des résultats
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    RÉSULTATS DU DIAGNOSTIC                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Statistiques Globales:" -ForegroundColor Cyan
Write-Host "  • Total drivers scannés:      $($stats.totalDrivers)" -ForegroundColor White
Write-Host "  • Drivers avec images:        $($stats.driversWithImages)" -ForegroundColor Green
Write-Host "  • Drivers sans images:        $($stats.driversWithoutImages)" -ForegroundColor Yellow
Write-Host "  • Total références d'images:  $($stats.totalImageReferences)" -ForegroundColor White
Write-Host "  • Images valides:             $($stats.validImages)" -ForegroundColor Green
Write-Host "  • Images manquantes:          $($stats.missingImages)" -ForegroundColor Red
Write-Host ""

# Drivers avec problèmes
$driversWithIssues = $results.drivers | Where-Object { $_.status -ne "OK" }
if ($driversWithIssues.Count -gt 0) {
    Write-Host "⚠️  DRIVERS AVEC PROBLÈMES: $($driversWithIssues.Count)" -ForegroundColor Red
    Write-Host ""
    
    foreach ($driver in $driversWithIssues) {
        Write-Host "  ❌ $($driver.name)" -ForegroundColor Red
        foreach ($issue in $driver.issues) {
            Write-Host "      └─ $issue" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

# Patterns d'images les plus utilisés
Write-Host "📁 Patterns de chemins d'images:" -ForegroundColor Cyan
$imagePaths = @{}
foreach ($driver in $results.drivers) {
    if ($driver.images.small) { 
        $path = $driver.images.small.originalPath
        if (-not $imagePaths[$path]) { $imagePaths[$path] = 0 }
        $imagePaths[$path]++
    }
}

$topPatterns = $imagePaths.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5
foreach ($pattern in $topPatterns) {
    Write-Host "  • $($pattern.Key): $($pattern.Value) drivers" -ForegroundColor White
}
Write-Host ""

# Recommandations
Write-Host "💡 Recommandations:" -ForegroundColor Cyan
if ($stats.missingImages -gt 0) {
    Write-Host "  1. Vérifier et créer les images manquantes" -ForegroundColor Yellow
    Write-Host "  2. Utiliser le pattern standard: './assets/small.png'" -ForegroundColor Yellow
    Write-Host "  3. Toujours inclure small.png et large.png" -ForegroundColor Yellow
}
if ($stats.driversWithoutImages -gt 0) {
    Write-Host "  4. Ajouter des images aux $($stats.driversWithoutImages) drivers sans images" -ForegroundColor Yellow
}
Write-Host ""

# Exporter rapport JSON
if ($ExportReport) {
    $fullReport = @{
        metadata = @{
            timestamp = $timestamp
            projectRoot = $projectRoot
            driversScanned = $stats.totalDrivers
        }
        statistics = $stats
        drivers = $results.drivers
    }
    
    $fullReport | ConvertTo-Json -Depth 10 | Set-Content $reportPath
    Write-Host "✅ Rapport exporté: $reportPath" -ForegroundColor Green
}

# Fixer automatiquement les problèmes (si demandé)
if ($FixIssues) {
    Write-Host ""
    Write-Host "🔧 Mode auto-fix activé..." -ForegroundColor Yellow
    Write-Host "  (Fonctionnalité à implémenter)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Diagnostic terminé!" -ForegroundColor Green
