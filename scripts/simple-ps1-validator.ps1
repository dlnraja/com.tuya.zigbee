# Simple PS1 Validator
# Mode enrichissement additif

Write-Host "🔧 SIMPLE PS1 VALIDATOR" -ForegroundColor Green
Write-Host "Mode enrichissement additif" -ForegroundColor Yellow

# Fonction simple de validation
function Test-SimplePS1 {
    param([string]$filePath)
    
    Write-Host "Test: $filePath" -ForegroundColor Yellow
    
    try {
        # Test basique de lecture
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Vérifications simples
        $checks = @{
            "Contenu non vide" = $content.Length -gt 0
            "Pas de caractères bizarres" = $content -notmatch "\\\$"
            "Guillemets équilibrés" = ($content.Split('"').Count - 1) % 2 -eq 0
            "Accolades équilibrées" = ($content.Split('{').Count - 1) -eq ($content.Split('}').Count - 1)
        }
        
        $passed = ($checks.Values | Where-Object { $_ }).Count
        $total = $checks.Count
        
        if ($passed -eq $total) {
            Write-Host "✅ OK: $passed/$total tests" -ForegroundColor Green
            return "PASS"
        } else {
            Write-Host "⚠️ WARN: $passed/$total tests" -ForegroundColor Yellow
            return "WARN"
        }
        
    } catch {
        Write-Host "❌ ERROR: $_" -ForegroundColor Red
        return "FAIL"
    }
}

# Exécution
Write-Host "Début de la validation..." -ForegroundColor Green

# Lister les fichiers PS1
$ps1Files = Get-ChildItem -Recurse -Filter "*.ps1" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*\.git*" 
}

Write-Host "Fichiers PS1 trouvés: $($ps1Files.Count)" -ForegroundColor Green

# Tester chaque fichier
$results = @()
$passCount = 0
$warnCount = 0
$failCount = 0

foreach ($file in $ps1Files) {
    $result = Test-SimplePS1 $file.FullName
    
    $results += [PSCustomObject]@{
        File = $file.Name
        Status = $result
    }
    
    switch ($result) {
        "PASS" { $passCount++ }
        "WARN" { $warnCount++ }
        "FAIL" { $failCount++ }
    }
}

# Rapport final
Write-Host "`n📊 RAPPORT FINAL" -ForegroundColor Magenta
Write-Host "================" -ForegroundColor Gray
Write-Host "Total: $($ps1Files.Count)" -ForegroundColor White
Write-Host "✅ PASS: $passCount" -ForegroundColor Green
Write-Host "⚠️ WARN: $warnCount" -ForegroundColor Yellow
Write-Host "❌ FAIL: $failCount" -ForegroundColor Red

# Afficher les résultats
$results | Format-Table -AutoSize

Write-Host "`n🎉 VALIDATION TERMINÉE" -ForegroundColor Green 