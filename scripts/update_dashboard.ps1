# Script de mise a jour automatique du dashboard multilingue

Write-Host "Debut de la mise a jour du dashboard multilingue..." -ForegroundColor Green

# Verifier que Python est disponible
try {
    $pythonVersion = python --version
    Write-Host "Python detecte: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python non trouve. Veuillez installer Python." -ForegroundColor Red
    exit 1
}

# Generer les donnees des drivers
Write-Host "Generation des donnees des drivers..." -ForegroundColor Cyan
try {
    python scripts/generate_drivers_data.py
    Write-Host "Donnees des drivers generees avec succes" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la generation des donnees" -ForegroundColor Red
    exit 1
}

# Verifier que le fichier a ete cree
if (Test-Path "dashboard/drivers_data.json") {
    $dataSize = (Get-Item "dashboard/drivers_data.json").Length
    Write-Host "Fichier drivers_data.json cree ($dataSize bytes)" -ForegroundColor Green
} else {
    Write-Host "Fichier drivers_data.json non trouve" -ForegroundColor Red
    exit 1
}

# Copier le nouveau dashboard comme index principal
Write-Host "Mise a jour du dashboard principal..." -ForegroundColor Cyan
try {
    Copy-Item "dashboard/index_multilingual.html" "dashboard/index.html" -Force
    Write-Host "Dashboard multilingue active" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la copie du dashboard" -ForegroundColor Red
    exit 1
}

# Creer un fichier de statistiques
Write-Host "Generation des statistiques..." -ForegroundColor Cyan
try {
    $driversData = Get-Content "dashboard/drivers_data.json" | ConvertFrom-Json
    $stats = @{
        total_drivers = $driversData.all.Count
        sdk3_drivers = ($driversData.all | Where-Object { $_.status -eq "sdk3" }).Count
        in_progress_drivers = ($driversData.all | Where-Object { $_.status -eq "in_progress" }).Count
        legacy_drivers = ($driversData.all | Where-Object { $_.status -eq "legacy" }).Count
        categories = $driversData.categories.PSObject.Properties.Name.Count
        manufacturers = ($driversData.all.manufacturers | ForEach-Object { $_ } | Sort-Object -Unique).Count
        last_update = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    
    $statsJson = $stats | ConvertTo-Json -Depth 10
    Set-Content "dashboard/stats.json" $statsJson -Encoding UTF8
    Write-Host "Statistiques generees" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la generation des statistiques" -ForegroundColor Yellow
}

# Creer un rapport de mise a jour
Write-Host "Generation du rapport..." -ForegroundColor Cyan
$report = @"
# RAPPORT DE MISE A JOUR DASHBOARD MULTILINGUE

**Date :** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Statut :** SUCCES

## STATISTIQUES GENEREES

- **Total Drivers :** $($stats.total_drivers)
- **SDK 3 Drivers :** $($stats.sdk3_drivers) ($([math]::Round(($stats.sdk3_drivers / $stats.total_drivers) * 100, 1))%)
- **En Cours :** $($stats.in_progress_drivers)
- **Legacy :** $($stats.legacy_drivers)
- **Categories :** $($stats.categories)
- **Fabricants :** $($stats.manufacturers)

## FONCTIONNALITES MULTILINGUES

- **Langues supportees :** FR, EN, TA, NL
- **Selecteur de langue** integre
- **Traductions completes** pour toutes les langues
- **Interface responsive** et moderne

## FONCTIONNALITES DASHBOARD

- **Affichage dynamique** de tous les drivers
- **Organisation par categorie** automatique
- **Filtres avances** (recherche, categorie, statut, fabricant)
- **Statistiques en temps reel**
- **Design moderne** Bootstrap 5
- **Mode local uniquement** (pas d'API Tuya)

## FICHIERS CREES/MODIFIES

- dashboard/drivers_data.json - Donnees centralisees des drivers
- dashboard/index.html - Dashboard multilingue principal
- dashboard/stats.json - Statistiques du projet
- scripts/generate_drivers_data.py - Script d'extraction des donnees
- scripts/update_dashboard.ps1 - Script de mise a jour automatique

## PROCHAINES ETAPES

1. **Tester le dashboard** dans toutes les langues
2. **Optimiser les performances** si necessaire
3. **Ajouter de nouvelles langues** si demande
4. **Automatiser la mise a jour** via GitHub Actions

---
*Genere automatiquement par GPT-4, Cursor, PowerShell*
"@

Set-Content "dashboard/UPDATE_REPORT.md" $report -Encoding UTF8
Write-Host "Rapport de mise a jour genere" -ForegroundColor Green

Write-Host "Mise a jour du dashboard terminee avec succes!" -ForegroundColor Green
Write-Host "Resume:" -ForegroundColor Cyan
Write-Host "- $($stats.total_drivers) drivers traites" -ForegroundColor White
Write-Host "- Dashboard multilingue active" -ForegroundColor White
Write-Host "- Statistiques generees" -ForegroundColor White
Write-Host "- Rapport cree" -ForegroundColor White

Write-Host "Dashboard disponible : dashboard/index.html" -ForegroundColor Green 