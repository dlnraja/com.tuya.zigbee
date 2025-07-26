# Master Enrichment Executor
# Mode enrichissement additif - Granularité fine

Write-Host "🚀 MASTER ENRICHISSEMENT EXECUTOR" -ForegroundColor Green
Write-Host "Mode enrichissement additif - Granularité fine" -ForegroundColor Yellow
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# Fonction de vérification des prérequis
function Test-Prerequisites {
    Write-Host "Vérification des prérequis..." -ForegroundColor Yellow
    
    $prerequisites = @{
        "Git" = git --version 2>$null
        "PowerShell" = $PSVersionTable.PSVersion
        "Node.js" = node --version 2>$null
        "npm" = npm --version 2>$null
    }
    
    foreach ($prereq in $prerequisites.GetEnumerator()) {
        if ($prereq.Value) {
            Write-Host "✅ $($prereq.Key): OK" -ForegroundColor Green
        } else {
            Write-Host "❌ $($prereq.Key): MANQUANT" -ForegroundColor Red
        }
    }
}

# Fonction d'exécution des phases
function Invoke-EnrichmentPhase {
    param([string]$phaseName, [string]$scriptPath)
    
    Write-Host "`n🔄 EXÉCUTION PHASE: $phaseName" -ForegroundColor Magenta
    Write-Host "Script: $scriptPath" -ForegroundColor Yellow
    
    if (Test-Path $scriptPath) {
        try {
            $startTime = Get-Date
            & $scriptPath
            $endTime = Get-Date
            $duration = $endTime - $startTime
            
            Write-Host "✅ PHASE TERMINÉE: $phaseName" -ForegroundColor Green
            Write-Host "⏱️ Durée: $($duration.TotalSeconds.ToString('F2')) secondes" -ForegroundColor Cyan
            return $true
        } catch {
            Write-Host "❌ ERREUR PHASE: $phaseName" -ForegroundColor Red
            Write-Host "Erreur: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ SCRIPT MANQUANT: $scriptPath" -ForegroundColor Red
        return $false
    }
}

# Fonction de rapport de progression
function Write-ProgressReport {
    param([hashtable]$results)
    
    Write-Host "`n📊 RAPPORT DE PROGRESSION" -ForegroundColor Magenta
    Write-Host "================================" -ForegroundColor Gray
    
    $totalPhases = $results.Count
    $successPhases = ($results.Values | Where-Object { $_ }).Count
    $successRate = [math]::Round(($successPhases / $totalPhases) * 100, 1)
    
    Write-Host "Phases totales: $totalPhases" -ForegroundColor White
    Write-Host "Phases réussies: $successPhases" -ForegroundColor Green
    Write-Host "Taux de succès: $successRate%" -ForegroundColor Cyan
    
    foreach ($phase in $results.GetEnumerator()) {
        $status = if ($phase.Value) { "✅" } else { "❌" }
        Write-Host "$status $($phase.Key)" -ForegroundColor $(if ($phase.Value) { "Green" } else { "Red" })
    }
}

# Fonction de nettoyage final
function Invoke-FinalCleanup {
    Write-Host "`n🧹 NETTOYAGE FINAL" -ForegroundColor Yellow
    
    # Supprimer les fichiers temporaires
    $tempFiles = @("*.tmp", "*.temp", "*.bak", "*.log")
    foreach ($pattern in $tempFiles) {
        Get-ChildItem -Recurse -Filter $pattern -ErrorAction SilentlyContinue | Remove-Item -Force
    }
    
    # Nettoyer les dossiers vides
    Get-ChildItem -Recurse -Directory | Where-Object { 
        (Get-ChildItem $_.FullName -Force | Measure-Object).Count -eq 0 
    } | Remove-Item -Force
    
    Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
}

# Exécution principale
Write-Host "Début de l'exécution maître..." -ForegroundColor Green

# 1. Vérification des prérequis
Test-Prerequisites

# 2. Définition des phases
$phases = @{
    "Phase 1: Dashboard Enrichissement" = "scripts/phase1-dashboard-enrichment.ps1"
    "Phase 2: Tuya Smart Life Analysis" = "scripts/phase2-tuya-smart-life-analysis.ps1"
    "Phase 3: Drivers Validation" = "scripts/phase3-drivers-validation.ps1"
    "Phase 4: Workflows Optimization" = "scripts/phase4-workflows-optimization.ps1"
    "Phase 5: Final Push" = "scripts/phase5-final-push.ps1"
}

# 3. Exécution des phases
$results = @{}
$startTime = Get-Date

foreach ($phase in $phases.GetEnumerator()) {
    $results[$phase.Key] = Invoke-EnrichmentPhase $phase.Key $phase.Value
    
    # Pause entre les phases
    Start-Sleep -Seconds 2
}

$endTime = Get-Date
$totalDuration = $endTime - $startTime

# 4. Rapport de progression
Write-ProgressReport $results

# 5. Nettoyage final
Invoke-FinalCleanup

# 6. Rapport final
Write-Host "`n🎉 RAPPORT FINAL" -ForegroundColor Magenta
Write-Host "================" -ForegroundColor Gray
Write-Host "Durée totale: $($totalDuration.TotalMinutes.ToString('F2')) minutes" -ForegroundColor Cyan
Write-Host "Mode: Enrichissement additif - Granularité fine" -ForegroundColor Yellow
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

$successCount = ($results.Values | Where-Object { $_ }).Count
if ($successCount -eq $results.Count) {
    Write-Host "`n🎊 TOUTES LES PHASES RÉUSSIES!" -ForegroundColor Green
    Write-Host "Enrichissement complet terminé avec succès" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ CERTAINES PHASES ONT ÉCHOUÉ" -ForegroundColor Yellow
    Write-Host "Vérifiez les erreurs ci-dessus" -ForegroundColor Yellow
}

Write-Host "`n🚀 MASTER ENRICHISSEMENT EXECUTOR TERMINÉ" -ForegroundColor Green 