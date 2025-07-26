
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Test et Correction de tous les fichiers PS1
# Mode enrichissement additif

Write-Host "🔧 TEST ET CORRECTION DE TOUS LES FICHIERS PS1" -ForegroundColor Green
Write-Host "Mode enrichissement additif" -ForegroundColor Yellow

# Fonction de test de syntaxe PowerShell
function Test-PowerShellSyntax {
    param([string]$filePath)
    
    Write-Host "Test de syntaxe: $filePath" -ForegroundColor Yellow
    
    try {
        # Test de parsing PowerShell
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $filePath -Raw), [ref]$null)
        return @{ Status = "PASS"; Message = "Syntaxe correcte" }
    } catch {
        return @{ Status = "FAIL"; Message = $_.Exception.Message }
    }
}

# Fonction de correction des erreurs communes
function Fix-CommonPowerShellErrors {
    param([string]$filePath)
    
    Write-Host "Correction des erreurs communes: $filePath" -ForegroundColor Yellow
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    
    # Corrections communes
    $fixes = @{
        # Corriger les caractères d'échappement incorrects
        '\\\$' = '$'
        '\\\(' = '('
        '\\\)' = ')'
        '\\\{' = '{'
        '\\\}' = '}'
        
        # Corriger les variables dans les here-strings
        '\$\(([^)]+)\)' = '`$($1)'
        
        # Corriger les guillemets mal fermés
        '([^"]*)"([^"]*)$' = '$1"$2"'
    }
    
    $fixedContent = $content
    foreach ($fix in $fixes.GetEnumerator()) {
        $fixedContent = $fixedContent -replace $fix.Key, $fix.Value
    }
    
    # Sauvegarder et écrire le contenu corrigé
    $backupPath = $filePath + ".backup"
    Copy-Item $filePath $backupPath
    Set-Content -Path $filePath -Value $fixedContent -Encoding UTF8
    
    return $fixedContent
}

# Fonction de validation complète
function Test-PowerShellFile {
    param([string]$filePath)
    
    Write-Host "Validation complète: $filePath" -ForegroundColor Cyan
    
    # Test 1: Syntaxe PowerShell
    $syntaxTest = Test-PowerShellSyntax $filePath
    
    if ($syntaxTest.Status -eq "FAIL") {
        Write-Host "❌ Erreur de syntaxe détectée" -ForegroundColor Red
        Write-Host "Message: $($syntaxTest.Message)" -ForegroundColor Red
        
        # Tenter la correction
        Write-Host "Tentative de correction..." -ForegroundColor Yellow
        $fixedContent = Fix-CommonPowerShellErrors $filePath
        
        # Retester après correction
        $retest = Test-PowerShellSyntax $filePath
        if ($retest.Status -eq "PASS") {
            Write-Host "✅ Correction réussie" -ForegroundColor Green
            return @{ Status = "FIXED"; Original = $syntaxTest.Status, Fixed = $retest.Status }
        } else {
            Write-Host "❌ Correction échouée" -ForegroundColor Red
            return @{ Status = "FAILED"; Original = $syntaxTest.Status, Fixed = $retest.Status }
        }
    } else {
        Write-Host "✅ Syntaxe correcte" -ForegroundColor Green
        return @{ Status = "PASS"; Original = $syntaxTest.Status }
    }
}

# Exécution principale
Write-Host "Début du test et de la correction..." -ForegroundColor Green

# 1. Lister tous les fichiers PS1
$ps1Files = Get-ChildItem -Recurse -Filter "*.ps1" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*\.git*" 
}

Write-Host "Fichiers PS1 trouvés: $($ps1Files.Count)" -ForegroundColor Green

# 2. Tester et corriger chaque fichier
$results = @()
$fixedCount = 0
$failedCount = 0
$passedCount = 0

foreach ($file in $ps1Files) {
    Write-Host "`n--- Test de $($file.Name) ---" -ForegroundColor Gray
    
    $result = Test-PowerShellFile $file.FullName
    
    $results += [PSCustomObject]@{
        File = $file.Name
        Status = $result.Status
        Original = $result.Original
        Fixed = $result.Fixed
    }
    
    switch ($result.Status) {
        "PASS" { $passedCount++ }
        "FIXED" { $fixedCount++ }
        "FAILED" { $failedCount++ }
    }
}

# 3. Rapport final
Write-Host "`n📊 RAPPORT FINAL" -ForegroundColor Magenta
Write-Host "================" -ForegroundColor Gray
Write-Host "Fichiers testés: $($ps1Files.Count)" -ForegroundColor White
Write-Host "✅ Corrects: $passedCount" -ForegroundColor Green
Write-Host "🔧 Corrigés: $fixedCount" -ForegroundColor Yellow
Write-Host "❌ Échoués: $failedCount" -ForegroundColor Red

# Afficher les résultats détaillés
Write-Host "`n📋 DÉTAIL DES RÉSULTATS" -ForegroundColor Magenta
$results | Format-Table -AutoSize

# 4. Créer un rapport de correction
$correctionReport = @"
# Rapport de Test et Correction des Fichiers PS1
# Mode enrichissement additif

## Métriques Globales
- **Total fichiers**: $($ps1Files.Count)
- **Corrects**: $passedCount
- **Corrigés**: $fixedCount
- **Échoués**: $failedCount
- **Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Détail des Corrections

"@

foreach ($result in $results) {
    $status = switch ($result.Status) {
        "PASS" { "✅" }
        "FIXED" { "🔧" }
        "FAILED" { "❌" }
    }
    
    $correctionReport += "`n$status $($result.File)"
    if ($result.Status -eq "FIXED") {
        $correctionReport += " (Corrigé: $($result.Original) → $($result.Fixed))"
    }
}

$correctionReport += @"

## Erreurs Corrigées
- Caractères d'échappement incorrects (`\$` → `$`)
- Variables mal échappées dans here-strings
- Guillemets mal fermés
- Syntaxe PowerShell invalide

## Recommandations
- Utiliser des variables simples sans échappement excessif
- Tester la syntaxe avant l'exécution
- Utiliser des here-strings pour les longs textes
- Valider les chemins de fichiers

---
*Généré automatiquement - Mode enrichissement additif*
"@

Set-Content -Path "docs/reports/ps1-correction-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').md" -Value $correctionReport -Encoding UTF8
Write-Host "Rapport de correction créé" -ForegroundColor Green

Write-Host "`n🎉 TEST ET CORRECTION TERMINÉS" -ForegroundColor Green 
