# SCRIPT UNBRAND + HARMONISATION COMPLÈTE
# Retire "hybrid" des noms, supprime parenthèses dans traductions, harmonise tout

$driversPath = "drivers"
$fixes = @()

Write-Host "🔍 ANALYSE UNBRAND + HARMONISATION..." -ForegroundColor Cyan

# PROBLÈME 1: Drivers avec "hybrid" dans le nom de dossier
$hybridDrivers = @(
    "switch_hybrid_1gang",
    "switch_hybrid_2gang", 
    "switch_hybrid_2gang_alt",
    "switch_hybrid_3gang",
    "switch_hybrid_4gang",
    "water_valve_smart_hybrid"
)

Write-Host "`n📁 DRIVERS 'HYBRID' TROUVÉS:" -ForegroundColor Yellow
foreach ($driver in $hybridDrivers) {
    $path = Join-Path $driversPath $driver
    if (Test-Path $path) {
        Write-Host "   ❌ $driver" -ForegroundColor Red
        $fixes += @{
            Type = "RenameDriver"
            Old = $driver
            New = ($driver -replace "_hybrid", "")
            Reason = "Remove 'hybrid' from folder name"
        }
    }
}

# PROBLÈME 2: "Hybrid" dans les traductions
Write-Host "`n📝 RECHERCHE 'HYBRID' DANS TRADUCTIONS..." -ForegroundColor Yellow
$hybridInTranslations = @()

Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"en":\s*"[^"]*[Hh]ybrid[^"]*"') {
        $driver = ($_.Directory.Name)
        Write-Host "   ❌ $driver - contient 'Hybrid' dans traductions" -ForegroundColor Red
        $hybridInTranslations += $driver
        $fixes += @{
            Type = "RemoveHybridText"
            Driver = $driver
            File = $_.FullName
            Reason = "Remove 'Hybrid' from translations"
        }
    }
}

# PROBLÈME 3: Parenthèses inutiles dans settings/labels
Write-Host "`n📝 RECHERCHE PARENTHÈSES DANS TRADUCTIONS..." -ForegroundColor Yellow
$parenthesesDrivers = @()

Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    # Cherche (3V), (1.5V), (hours), etc. mais pas (More responsive) qui est utile
    if ($content -match '"en":\s*"[^"]*\([0-9]+[VvAa%]|hours?\)[^"]*"' -or 
        $content -match '"fr":\s*"[^"]*\([0-9]+[VvAa%]|heures?\)[^"]*"') {
        $driver = ($_.Directory.Name)
        if ($driver -notin $parenthesesDrivers) {
            Write-Host "   ⚠️  $driver - contient parenthèses techniques" -ForegroundColor Yellow
            $parenthesesDrivers += $driver
        }
    }
}

# PROBLÈME 4: Architecture incohérente
Write-Host "`n📊 ANALYSE ARCHITECTURE..." -ForegroundColor Yellow

# Groupes de drivers similaires
$switchGroups = @{
    "Wall Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_wall_*" })
    "Touch Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_touch_*" -or $_.Name -like "wall_touch_*" })
    "Wireless Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_wireless_*" })
    "Smart Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_smart_*" })
    "Basic Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_basic_*" })
    "Generic Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_generic_*" })
    "Hybrid Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_hybrid_*" })
    "Internal Switches" = @(Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_internal_*" })
}

foreach ($group in $switchGroups.Keys) {
    $count = $switchGroups[$group].Count
    if ($count -gt 0) {
        Write-Host "   - $group : $count drivers" -ForegroundColor Cyan
    }
}

# RAPPORT FINAL
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ PROBLÈMES TROUVÉS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n1️⃣  DOSSIERS 'HYBRID':" -ForegroundColor Yellow
Write-Host "   Trouvés: $($hybridDrivers.Count) drivers" -ForegroundColor White
foreach ($driver in $hybridDrivers) {
    $newName = $driver -replace "_hybrid", ""
    Write-Host "   $driver → $newName" -ForegroundColor Gray
}

Write-Host "`n2️⃣  'HYBRID' DANS TEXTES:" -ForegroundColor Yellow
Write-Host "   Trouvés: $($hybridInTranslations.Count) drivers" -ForegroundColor White

Write-Host "`n3️⃣  PARENTHÈSES TECHNIQUES:" -ForegroundColor Yellow
Write-Host "   Trouvés: $($parenthesesDrivers.Count) drivers" -ForegroundColor White
Write-Host "   Note: Les parenthèses pour (More responsive), (Longer battery) sont OK" -ForegroundColor Gray

Write-Host "`n4️⃣  ARCHITECTURE SWITCHES:" -ForegroundColor Yellow
Write-Host "   7 catégories différentes de switches" -ForegroundColor White
Write-Host "   Recommandation: Consolider architecture" -ForegroundColor Gray

# RECOMMANDATIONS
Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💡 RECOMMANDATIONS" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n✅ ACTIONS PRIORITAIRES:" -ForegroundColor Green
Write-Host "   1. Renommer drivers 'hybrid' → drivers sans 'hybrid'" -ForegroundColor White
Write-Host "   2. Remplacer 'Hybrid' dans tous les textes traductions" -ForegroundColor White
Write-Host "   3. Simplifier parenthèses (garder seulement explications utiles)" -ForegroundColor White
Write-Host "   4. Harmoniser architecture switches (créer catégories claires)" -ForegroundColor White

Write-Host "`n📋 NOMENCLATURE PROPOSÉE:" -ForegroundColor Green
Write-Host "   switch_wall_Xgang      - Switches muraux standard" -ForegroundColor White
Write-Host "   switch_touch_Xgang     - Switches tactiles" -ForegroundColor White
Write-Host "   switch_wireless_Xgang  - Switches sans fil" -ForegroundColor White
Write-Host "   switch_smart_Xgang     - Switches intelligents avancés" -ForegroundColor White
Write-Host "   switch_dimmer_Xgang    - Dimmers" -ForegroundColor White

Write-Host "`n⚠️  ATTENTION:" -ForegroundColor Yellow
Write-Host "   - Renommer drivers = breaking change potentiel" -ForegroundColor White
Write-Host "   - Vérifier pairings existants" -ForegroundColor White
Write-Host "   - Tester validation Homey après modifications" -ForegroundColor White

Write-Host "`n✅ SCRIPT TERMINÉ" -ForegroundColor Green
Write-Host "   Problèmes identifiés: $($fixes.Count)" -ForegroundColor White
Write-Host "   Rapport sauvegardé: reports/unbrand-analysis.json" -ForegroundColor White

# Sauvegarder rapport
$reportPath = "reports"
if (-not (Test-Path $reportPath)) {
    New-Item -ItemType Directory -Path $reportPath -Force | Out-Null
}

$report = @{
    Date = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    HybridDrivers = $hybridDrivers
    HybridInTranslations = $hybridInTranslations
    ParenthesesDrivers = $parenthesesDrivers
    TotalFixes = $fixes.Count
    Fixes = $fixes
    SwitchGroups = @{}
}

foreach ($group in $switchGroups.Keys) {
    $report.SwitchGroups[$group] = $switchGroups[$group].Name
}

$report | ConvertTo-Json -Depth 10 | Out-File (Join-Path $reportPath "unbrand-analysis.json")

Write-Host "`n🎯 PROCHAINE ÉTAPE: Exécuter fix script si validé" -ForegroundColor Cyan
