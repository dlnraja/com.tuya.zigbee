
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Test Workflows - Validation de tous les workflows GitHub Actions
# Mode enrichissement additif - Granularité fine

Write-Host "TEST WORKFLOWS - VALIDATION COMPLÈTE" -ForegroundColor Green
Write-Host "Mode enrichissement additif - Granularité fine" -ForegroundColor Yellow

# Fonction de test des workflows
function Test-Workflows {
    Write-Host "Validation des workflows GitHub Actions..." -ForegroundColor Yellow
    
    $workflowsDir = ".github/workflows"
    $requiredWorkflows = @(
        "auto-changelog.yml",
        "auto-commit-message-improvement.yml",
        "auto-enrich-drivers.yml",
        "auto-markdown-reorganization.yml",
        "auto-todo-sync.yml",
        "auto-translation.yml",
        "auto-update.yml",
        "cross-platform-git-fix.yml",
        "monthly-check.yml"
    )
    
    $results = @()
    
    # Vérifier la présence des workflows
    foreach ($workflow in $requiredWorkflows) {
        $workflowPath = Join-Path $workflowsDir $workflow
        if (Test-Path $workflowPath) {
            Write-Host "[OK] $workflow : Présent" -ForegroundColor Green
            $status = "PRESENT"
        } else {
            Write-Host "[ERROR] $workflow : Manquant" -ForegroundColor Red
            $status = "MISSING"
        }
        
        $results += [PSCustomObject]@{
            Workflow = $workflow
            Status = $status
            Path = $workflowPath
        }
    }
    
    # Vérifier les triggers manuels
    Write-Host "`nVérification des triggers manuels..." -ForegroundColor Yellow
    foreach ($result in $results | Where-Object { $_.Status -eq "PRESENT" }) {
        try {
            $content = Get-Content $result.Path -Raw -Encoding UTF8
            if ($content -match "workflow_dispatch:") {
                Write-Host "[OK] $($result.Workflow) : Trigger manuel activé" -ForegroundColor Green
                $result.Status = "PRESENT_WITH_MANUAL"
            } else {
                Write-Host "[WARN] $($result.Workflow) : Trigger manuel manquant" -ForegroundColor Yellow
                $result.Status = "PRESENT_NO_MANUAL"
            }
        } catch {
            Write-Host "[ERROR] $($result.Workflow) : Erreur de lecture" -ForegroundColor Red
            $result.Status = "ERROR"
        }
    }
    
    return $results
}

# Fonction de génération de rapport
function Generate-WorkflowReport {
    param([array]$workflowResults)
    
    $reportDate = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $report = @"
# Workflow Test Report - $reportDate
# Mode enrichissement additif

## Workflow Validation Results
"@
    
    $presentCount = ($workflowResults | Where-Object { $_.Status -like "PRESENT*" }).Count
    $missingCount = ($workflowResults | Where-Object { $_.Status -eq "MISSING" }).Count
    $errorCount = ($workflowResults | Where-Object { $_.Status -eq "ERROR" }).Count
    
    $report += "`n- Total Workflows: $($workflowResults.Count)"
    $report += "`n- Present: $presentCount"
    $report += "`n- Missing: $missingCount"
    $report += "`n- Errors: $errorCount"
    
    foreach ($result in $workflowResults) {
        $status = switch ($result.Status) {
            "PRESENT_WITH_MANUAL" { "[OK]" }
            "PRESENT_NO_MANUAL" { "[WARN]" }
            "MISSING" { "[ERROR]" }
            "ERROR" { "[ERROR]" }
            default { "[UNKNOWN]" }
        }
        $report += "`n$status $($result.Workflow) - $($result.Status)"
    }
    
    $report += @"

## Recommendations
- Fix missing workflows immediately
- Add manual triggers to workflows without them
- Test all workflows in GitHub Actions
- Monitor workflow performance

---
*Generated automatically - Workflow validation test*
"@
    
    return $report
}

# Exécution principale
Write-Host "Début de la validation des workflows..." -ForegroundColor Green

# 1. Test des workflows
$workflowResults = Test-Workflows
Write-Host "Workflows testés: $($workflowResults.Count)" -ForegroundColor Green

# 2. Génération du rapport
$report = Generate-WorkflowReport $workflowResults

# 3. Sauvegarde du rapport
$reportPath = "docs/reports/workflow-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
Set-Content -Path $reportPath -Value $report -Encoding UTF8
Write-Host "Rapport sauvegardé: $reportPath" -ForegroundColor Green

# 4. Affichage du résumé
Write-Host "`n📊 RÉSUMÉ WORKFLOWS" -ForegroundColor Magenta
Write-Host "================" -ForegroundColor Gray

$presentCount = ($workflowResults | Where-Object { $_.Status -like "PRESENT*" }).Count
$missingCount = ($workflowResults | Where-Object { $_.Status -eq "MISSING" }).Count
$errorCount = ($workflowResults | Where-Object { $_.Status -eq "ERROR" }).Count

Write-Host "Workflows: $presentCount Présents, $missingCount Manquants, $errorCount Erreurs" -ForegroundColor $(if ($missingCount -eq 0 -and $errorCount -eq 0) { "Green" } else { "Red" })

Write-Host "`n🎉 VALIDATION WORKFLOWS TERMINÉE" -ForegroundColor Green 

