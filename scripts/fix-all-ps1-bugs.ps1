# Fix All PS1 Bugs - Version Simple
# Mode enrichissement additif

Write-Host "🔧 FIX ALL PS1 BUGS" -ForegroundColor Green
Write-Host "Mode enrichissement additif" -ForegroundColor Yellow

# Fonction de correction des bugs communs
function Fix-PS1Bugs {
    param([string]$filePath)
    
    Write-Host "Correction: $filePath" -ForegroundColor Yellow
    
    try {
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
            
            # Corriger les accolades mal fermées
            '([^{]*)\{([^}]*)$' = '$1{$2}'
        }
        
        $fixedContent = $content
        $changes = 0
        
        foreach ($fix in $fixes.GetEnumerator()) {
            $before = $fixedContent
            $fixedContent = $fixedContent -replace $fix.Key, $fix.Value
            if ($before -ne $fixedContent) {
                $changes++
            }
        }
        
        if ($changes -gt 0) {
            # Sauvegarder et écrire
            $backupPath = $filePath + ".backup"
            Copy-Item $filePath $backupPath
            Set-Content -Path $filePath -Value $fixedContent -Encoding UTF8
            Write-Host "✅ Corrigé ($changes changements)" -ForegroundColor Green
            return "FIXED"
        } else {
            Write-Host "✅ Déjà correct" -ForegroundColor Green
            return "OK"
        }
        
    } catch {
        Write-Host "❌ Erreur: $_" -ForegroundColor Red
        return "ERROR"
    }
}

# Exécution principale
Write-Host "Début de la correction..." -ForegroundColor Green

# Lister tous les fichiers PS1
$ps1Files = Get-ChildItem -Recurse -Filter "*.ps1" | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*\.git*" 
}

Write-Host "Fichiers PS1 trouvés: $($ps1Files.Count)" -ForegroundColor Green

# Corriger chaque fichier
$results = @()
$fixedCount = 0
$okCount = 0
$errorCount = 0

foreach ($file in $ps1Files) {
    $result = Fix-PS1Bugs $file.FullName
    
    $results += [PSCustomObject]@{
        File = $file.Name
        Status = $result
    }
    
    switch ($result) {
        "FIXED" { $fixedCount++ }
        "OK" { $okCount++ }
        "ERROR" { $errorCount++ }
    }
}

# Rapport final
Write-Host "`n📊 RAPPORT FINAL" -ForegroundColor Magenta
Write-Host "================" -ForegroundColor Gray
Write-Host "Total: $($ps1Files.Count)" -ForegroundColor White
Write-Host "🔧 Corrigés: $fixedCount" -ForegroundColor Yellow
Write-Host "✅ OK: $okCount" -ForegroundColor Green
Write-Host "❌ Erreurs: $errorCount" -ForegroundColor Red

# Afficher les fichiers corrigés
if ($fixedCount -gt 0) {
    Write-Host "`n📋 FICHIERS CORRIGÉS:" -ForegroundColor Magenta
    $results | Where-Object { $_.Status -eq "FIXED" } | ForEach-Object {
        Write-Host "🔧 $($_.File)" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 CORRECTION TERMINÉE" -ForegroundColor Green 