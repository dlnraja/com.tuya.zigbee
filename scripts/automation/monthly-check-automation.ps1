
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Monthly Check Automation - Vérification mensuelle automatique
# Mode enrichissement additif - Granularité fine

Write-Host "MONTHLY CHECK AUTOMATION" -ForegroundColor Green
Write-Host "Mode enrichissement additif - Granularité fine" -ForegroundColor Yellow

# Fonction de vérification des liens
function Test-Links {
    Write-Host "Vérification des liens..." -ForegroundColor Yellow
    
    $links = @(
        "https://apps.developer.homey.app/",
        "https://developer.tuya.com/",
        "https://zigbeealliance.org/",
        "https://csa-iot.org/",
        "https://docs.espressif.com/projects/esp-zigbee-sdk/en/latest/esp32/user-guide/zcl_custom.html",
        "https://www.nxp.com/docs/en/user-guide/JN-UG-3115.pdf",
        "https://onlinedocs.microchip.com/oxy/GUID-D176AD05-7AEE-4A67-B5B2-16E9E7E7FAC8-en-US-1/",
        "https://docs.silabs.com/zigbee/8.2.1/zigbee-fundamentals/06-zigbee-cluster-library",
        "https://github.com/Koenkk/Z-Stack-firmware/tree/master/coordinator/Z-Stack_3.x.0/bin",
        "https://github.com/Koenkk/zigbee-herdsman-converters",
        "https://iot.tuya.com/",
        "https://github.com/home-assistant/core/tree/dev/homeassistant/components/tuya",
        "https://www.home-assistant.io/",
        "https://www.openhab.org/",
        "https://www.domoticz.com/",
        "https://www.jeedom.com/",
        "https://nodered.org/",
        "https://www.zigbee2mqtt.io/",
        "https://github.com/features/copilot",
        "https://openai.com/chatgpt",
        "https://claude.ai/",
        "https://bard.google.com/",
        "https://www.deepseek.com/",
        "https://www.tuya.com/",
        "https://www.smart-life.com/",
        "https://homey.app/",
        "https://community.homey.app/",
        "https://developer.tuya.com/forum",
        "https://github.com/Koenkk/Z-Stack-firmware/discussions",
        "https://community.home-assistant.io/",
        "https://community.homey.app/t/app-universal-tuya-zigbee-device/140352/8"
    )
    
    $results = @()
    foreach ($link in $links) {
        try {
            $response = Invoke-WebRequest -Uri $link -Method Head -TimeoutSec 10
            $status = if ($response.StatusCode -eq 200) { "OK" } else { "ERROR" }
            $results += [PSCustomObject]@{
                Link = $link
                Status = $status
                Code = $response.StatusCode
            }
        } catch {
            $results += [PSCustomObject]@{
                Link = $link
                Status = "ERROR"
                Code = "N/A"
            }
        }
    }
    
    return $results
}

# Fonction de vérification des workflows
function Test-Workflows {
    Write-Host "Vérification des workflows..." -ForegroundColor Yellow
    
    $workflows = Get-ChildItem ".github/workflows" -Filter "*.yml" -ErrorAction SilentlyContinue
    $results = @()
    
    foreach ($workflow in $workflows) {
        try {
            $content = Get-Content $workflow.FullName -Raw -Encoding UTF8
            
            # Tests de validation workflow
            $tests = @{
                "YAML Syntax" = $content -match "name:|on:|jobs:"
                "Trigger Events" = $content -match "push:|pull_request:|workflow_dispatch:"
                "Job Definition" = $content -match "runs-on:|steps:"
                "Action Usage" = $content -match "uses:|with:"
            }
            
            $passedTests = ($tests.Values | Where-Object { $_ }).Count
            $totalTests = $tests.Count
            
            $status = if ($passedTests -eq $totalTests) { "OK" } else { "WARN" }
            $results += [PSCustomObject]@{
                Workflow = $workflow.Name
                Status = $status
                Score = "$passedTests/$totalTests"
            }
        } catch {
            $results += [PSCustomObject]@{
                Workflow = $workflow.Name
                Status = "ERROR"
                Score = "0/4"
            }
        }
    }
    
    return $results
}

# Fonction de génération de rapport
function Generate-MonthlyReport {
    param([array]$linkResults, [array]$workflowResults)
    
    $reportDate = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $report = @"
# Monthly Check Report - $reportDate
# Mode enrichissement additif

## Link Validation Results
"@
    
    $linkOk = ($linkResults | Where-Object { $_.Status -eq "OK" }).Count
    $linkError = ($linkResults | Where-Object { $_.Status -eq "ERROR" }).Count
    
    $report += "`n- Total Links: $($linkResults.Count)"
    $report += "`n- OK: $linkOk"
    $report += "`n- Errors: $linkError"
    
    foreach ($result in $linkResults) {
        $status = if ($result.Status -eq "OK") { "✅" } else { "❌" }
        $report += "`n$status $($result.Link) - $($result.Status)"
    }
    
    $report += @"

## Workflow Validation Results
"@
    
    $workflowOk = ($workflowResults | Where-Object { $_.Status -eq "OK" }).Count
    $workflowWarn = ($workflowResults | Where-Object { $_.Status -eq "WARN" }).Count
    $workflowError = ($workflowResults | Where-Object { $_.Status -eq "ERROR" }).Count
    
    $report += "`n- Total Workflows: $($workflowResults.Count)"
    $report += "`n- OK: $workflowOk"
    $report += "`n- Warnings: $workflowWarn"
    $report += "`n- Errors: $workflowError"
    
    foreach ($result in $workflowResults) {
        $status = switch ($result.Status) {
            "OK" { "✅" }
            "WARN" { "⚠️" }
            "ERROR" { "❌" }
        }
        $report += "`n$status $($result.Workflow) - $($result.Score)"
    }
    
    $report += @"

## Recommendations
- Fix broken links immediately
- Update outdated sources
- Optimize failing workflows
- Archive old reports

---
*Generated automatically - Monthly check automation*
"@
    
    return $report
}

# Exécution principale
Write-Host "Début de la vérification mensuelle..." -ForegroundColor Green

# 1. Vérification des liens
$linkResults = Test-Links
Write-Host "Liens vérifiés: $($linkResults.Count)" -ForegroundColor Green

# 2. Vérification des workflows
$workflowResults = Test-Workflows
Write-Host "Workflows vérifiés: $($workflowResults.Count)" -ForegroundColor Green

# 3. Génération du rapport
$report = Generate-MonthlyReport $linkResults $workflowResults

# 4. Sauvegarde du rapport
$reportPath = "docs/reports/monthly-check-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
Set-Content -Path $reportPath -Value $report -Encoding UTF8
Write-Host "Rapport sauvegardé: $reportPath" -ForegroundColor Green

# 5. Affichage du résumé
Write-Host "`n📊 RÉSUMÉ MENSUEL" -ForegroundColor Magenta
Write-Host "================" -ForegroundColor Gray

$linkOk = ($linkResults | Where-Object { $_.Status -eq "OK" }).Count
$linkError = ($linkResults | Where-Object { $_.Status -eq "ERROR" }).Count
Write-Host "Liens: $linkOk OK, $linkError Erreurs" -ForegroundColor $(if ($linkError -eq 0) { "Green" } else { "Red" })

$workflowOk = ($workflowResults | Where-Object { $_.Status -eq "OK" }).Count
$workflowWarn = ($workflowResults | Where-Object { $_.Status -eq "WARN" }).Count
$workflowError = ($workflowResults | Where-Object { $_.Status -eq "ERROR" }).Count
Write-Host "Workflows: $workflowOk OK, $workflowWarn Warnings, $workflowError Erreurs" -ForegroundColor $(if ($workflowError -eq 0) { "Green" } else { "Red" })

Write-Host "`n🎉 VÉRIFICATION MENSUELLE TERMINÉE" -ForegroundColor Green 
