
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Script de mise à jour des chemins
# Mode enrichissement additif

Write-Host "MISE A JOUR DES CHEMINS - Mode enrichissement" -ForegroundColor Green

# Mettre à jour les chemins dans les scripts PowerShell
$scriptFiles = Get-ChildItem "scripts" -Recurse -Filter "*.ps1"

foreach ($script in $scriptFiles) {
    Write-Host "Mise a jour: $($script.Name)" -ForegroundColor Yellow
    
    $content = Get-Content $script.FullName -Raw -Encoding UTF8
    
    # Remplacer les anciens chemins par les nouveaux
    $updated = $content -replace "docs/README\.md", "docs/README/README.md"
    $updated = $updated -replace "docs/CHANGELOG\.md", "docs/CHANGELOG/CHANGELOG.md"
    $updated = $updated -replace "docs/reports/", "docs/reports/"
    $updated = $updated -replace "TODO_REPRISE_49H\.md", "docs/todo/current/docs/todo/current/TODO_REPRISE_49H.md"
    $updated = $updated -replace "README_EN\.md", "docs/locales/en/README.md"
    $updated = $updated -replace "CONTRIBUTING\.md", "docs/CONTRIBUTING/docs/CONTRIBUTING/CONTRIBUTING.md"
    $updated = $updated -replace "CODE_OF_CONDUCT\.md", "docs/CODE_OF_CONDUCT/docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md"
    $updated = $updated -replace "docs/LICENSE/LICENSE", "docs/docs/LICENSE/LICENSE/docs/LICENSE/LICENSE"
    
    Set-Content -Path $script.FullName -Value $updated -Encoding UTF8
    Write-Host "SUCCESS: $($script.Name) mis a jour" -ForegroundColor Green
}

Write-Host "MISE A JOUR DES CHEMINS TERMINEE" -ForegroundColor Green 

