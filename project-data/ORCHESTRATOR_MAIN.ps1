# ============================================================================
# ORCHESTRATOR_MAIN.ps1
# ============================================================================
# Description: Orchestrateur principal - Lance tous les scripts d'analyse
# Author: Universal Tuya Zigbee Project
# Version: 2.0.0
# Date: 2025-01-15
# ============================================================================

param(
    [switch]$SkipImageDiag = $false,
    [switch]$SkipManufacturerAnalysis = $false,
    [switch]$SkipDatabaseExport = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $PSScriptRoot "orchestration_log_$timestamp.txt"

# Fonction de logging
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $colors = @{
        "INFO" = "White"
        "SUCCESS" = "Green"
        "WARNING" = "Yellow"
        "ERROR" = "Red"
        "STEP" = "Cyan"
    }
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage -ForegroundColor $colors[$Level]
    Add-Content -Path $logFile -Value $logMessage
}

# Banner
Clear-Host
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                   ORCHESTRATEUR PRINCIPAL V2.0                     ║" -ForegroundColor Cyan
Write-Host "║            Universal Tuya Zigbee - Analyse Complète               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Log "Démarrage de l'orchestration complète" "STEP"
Write-Log "Log file: $logFile" "INFO"
Write-Host ""

# Résultats d'exécution
$results = @{
    timestamp = $timestamp
    scripts = @()
    totalScripts = 0
    successfulScripts = 0
    failedScripts = 0
}

# Fonction: Exécuter un script
function Invoke-Script {
    param(
        [string]$ScriptName,
        [string]$Description,
        [hashtable]$Parameters = @{}
    )
    
    $results.totalScripts++
    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    
    Write-Log "Exécution: $Description" "STEP"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Log "Script non trouvé: $ScriptName" "ERROR"
        $results.failedScripts++
        $results.scripts += @{
            name = $ScriptName
            description = $Description
            status = "NOT_FOUND"
            duration = 0
        }
        return $false
    }
    
    $startTime = Get-Date
    
    try {
        $paramString = ""
        foreach ($key in $Parameters.Keys) {
            $paramString += " -$key"
            if ($Parameters[$key] -is [bool] -and $Parameters[$key]) {
                # Switch parameter
            } else {
                $paramString += " '$($Parameters[$key])'"
            }
        }
        
        Write-Log "  Commande: .\$ScriptName$paramString" "INFO"
        
        & $scriptPath @Parameters
        
        $duration = ((Get-Date) - $startTime).TotalSeconds
        Write-Log "  ✅ Terminé en $([math]::Round($duration, 2))s" "SUCCESS"
        
        $results.successfulScripts++
        $results.scripts += @{
            name = $ScriptName
            description = $Description
            status = "SUCCESS"
            duration = $duration
        }
        
        Write-Host ""
        return $true
        
    } catch {
        $duration = ((Get-Date) - $startTime).TotalSeconds
        Write-Log "  ❌ Erreur: $_" "ERROR"
        
        $results.failedScripts++
        $results.scripts += @{
            name = $ScriptName
            description = $Description
            status = "FAILED"
            error = $_.Exception.Message
            duration = $duration
        }
        
        Write-Host ""
        return $false
    }
}

# ============================================================================
# PHASE 1: DIAGNOSTIC DES IMAGES
# ============================================================================
if (-not $SkipImageDiag) {
    Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║                  PHASE 1: DIAGNOSTIC DES IMAGES                    ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    Invoke-Script `
        -ScriptName "DIAGNOSE_DRIVER_IMAGES.ps1" `
        -Description "Diagnostic profond des chemins d'images dans les drivers" `
        -Parameters @{ Verbose = $Verbose; ExportReport = $true }
} else {
    Write-Log "Phase 1 ignorée (SkipImageDiag)" "WARNING"
}

# ============================================================================
# PHASE 2: ANALYSE DES MANUFACTURERS
# ============================================================================
if (-not $SkipManufacturerAnalysis) {
    Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║              PHASE 2: ANALYSE DES MANUFACTURERS                    ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    Invoke-Script `
        -ScriptName "ANALYZE_MANUFACTURERS.ps1" `
        -Description "Analyse complète des manufacturer IDs dans les drivers"
    
    Invoke-Script `
        -ScriptName "FIND_MISSING_MANUFACTURERS.ps1" `
        -Description "Identification des manufacturer IDs manquants"
} else {
    Write-Log "Phase 2 ignorée (SkipManufacturerAnalysis)" "WARNING"
}

# ============================================================================
# PHASE 3: RECHERCHE ET ENRICHISSEMENT
# ============================================================================
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║           PHASE 3: RECHERCHE ET ENRICHISSEMENT                     ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

Write-Log "Recherche interactive dans la base de données" "INFO"
Write-Log "  Pour utiliser: .\SEARCH_MANUFACTURER.ps1" "INFO"
Write-Host ""

# ============================================================================
# PHASE 4: EXPORT ET DOCUMENTATION
# ============================================================================
if (-not $SkipDatabaseExport) {
    Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║            PHASE 4: EXPORT ET DOCUMENTATION                        ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    
    Invoke-Script `
        -ScriptName "EXPORT_DATABASE.ps1" `
        -Description "Export de la base de données (CSV, HTML, Markdown)"
} else {
    Write-Log "Phase 4 ignorée (SkipDatabaseExport)" "WARNING"
}

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                      ORCHESTRATION TERMINÉE                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Log "Résumé de l'orchestration:" "SUCCESS"
Write-Host "  • Scripts exécutés:  $($results.totalScripts)" -ForegroundColor White
Write-Host "  • Succès:            $($results.successfulScripts)" -ForegroundColor Green
Write-Host "  • Échecs:            $($results.failedScripts)" -ForegroundColor $(if($results.failedScripts -gt 0){"Red"}else{"Green"})
Write-Host ""

# Durée totale
$totalDuration = ($results.scripts | Measure-Object -Property duration -Sum).Sum
Write-Host "  ⏱️  Durée totale: $([math]::Round($totalDuration, 2))s" -ForegroundColor Cyan
Write-Host ""

# Liste des scripts exécutés
Write-Host "📋 Scripts exécutés:" -ForegroundColor Cyan
foreach ($script in $results.scripts) {
    $icon = if ($script.status -eq "SUCCESS") { "✅" } else { "❌" }
    $color = if ($script.status -eq "SUCCESS") { "Green" } else { "Red" }
    $duration = [math]::Round($script.duration, 2)
    
    Write-Host "  $icon $($script.name) [$($duration)s]" -ForegroundColor $color
    Write-Host "     $($script.description)" -ForegroundColor Gray
}
Write-Host ""

# Fichiers générés
Write-Log "Fichiers générés:" "INFO"
$generatedFiles = @(
    "IMAGE_DIAGNOSTIC_REPORT_*.json",
    "MANUFACTURER_ANALYSIS.json",
    "MISSING_MANUFACTURERS_REPORT.md",
    "manufacturer_database_*.csv",
    "manufacturer_database_*.html",
    "manufacturer_database_*.md"
)

foreach ($pattern in $generatedFiles) {
    $files = Get-ChildItem -Path $PSScriptRoot -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Write-Host "  📄 $($file.Name)" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Log "Log complet sauvegardé: $logFile" "SUCCESS"

# Export résultats JSON
$resultsFile = Join-Path $PSScriptRoot "orchestration_results_$timestamp.json"
$results | ConvertTo-Json -Depth 5 | Set-Content $resultsFile
Write-Log "Résultats exportés: $resultsFile" "SUCCESS"

Write-Host ""
Write-Host "✅ Orchestration terminée avec succès!" -ForegroundColor Green
Write-Host ""

# Recommandations
Write-Host "💡 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  1. Consulter les rapports générés" -ForegroundColor White
Write-Host "  2. Vérifier les images manquantes si détectées" -ForegroundColor White
Write-Host "  3. Enrichir la base de données si nécessaire" -ForegroundColor White
Write-Host "  4. Mettre à jour les drivers avec les nouveaux IDs" -ForegroundColor White
Write-Host ""
