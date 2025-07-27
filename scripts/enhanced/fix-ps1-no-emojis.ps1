
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Fix PS1 - Remove Emojis and Icons
# Mode enrichissement additif

Write-Host "FIX PS1 - REMOVE EMOJIS AND ICONS" -ForegroundColor Green
Write-Host "Mode enrichissement additif" -ForegroundColor Yellow

# Fonction de correction des emojis
function Fix-PS1Emojis {
    param([string]$filePath)
    
    Write-Host "Correction: $filePath" -ForegroundColor Yellow
    
    try {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Remplacer les emojis par du texte simple
        $emojiReplacements = @{
            '🚀' = '[LAUNCH]'
            '🔧' = '[FIX]'
            '✅' = '[OK]'
            '❌' = '[ERROR]'
            '⚠️' = '[WARN]'
            '📊' = '[REPORT]'
            '📋' = '[LIST]'
            '🎉' = '[SUCCESS]'
            '🔄' = '[PROCESS]'
            '📁' = '[FOLDER]'
            '📄' = '[FILE]'
            '🔗' = '[LINK]'
            '⚡' = '[FAST]'
            '🛡️' = '[SECURITY]'
            '🎯' = '[TARGET]'
            '📈' = '[CHART]'
            '📉' = '[CHART]'
            '💡' = '[IDEA]'
            '🔍' = '[SEARCH]'
            '📝' = '[NOTE]'
            '🔄' = '[UPDATE]'
            '⏱️' = '[TIME]'
            '📅' = '[DATE]'
            '🌍' = '[GLOBAL]'
            '🇫🇷' = '[FR]'
            '🇬🇧' = '[EN]'
            '🇹🇦' = '[TA]'
            '🇳🇱' = '[NL]'
            '🇩🇪' = '[DE]'
            '🇪🇸' = '[ES]'
            '🇮🇹' = '[IT]'
            '🇷🇺' = '[RU]'
            '🇵🇱' = '[PL]'
            '🇵🇹' = '[PT]'
        }
        
        $fixedContent = $content
        $changes = 0
        
        foreach ($emoji in $emojiReplacements.GetEnumerator()) {
            if ($fixedContent -match [regex]::Escape($emoji.Key)) {
                $fixedContent = $fixedContent -replace [regex]::Escape($emoji.Key), $emoji.Value
                $changes++
            }
        }
        
        # Corriger aussi les caractères d'échappement
        if ($fixedContent -match '\\\$') {
            $fixedContent = $fixedContent -replace '\\\$', '$'
            $changes++
        }
        
        if ($fixedContent -match '\\\\\(') {
            $fixedContent = $fixedContent -replace '\\\\\(', '('
            $changes++
        }
        
        if ($fixedContent -match '\\\\\)') {
            $fixedContent = $fixedContent -replace '\\\\\)', ')'
            $changes++
        }
        
        if ($changes -gt 0) {
            # Sauvegarder et écrire
            $backupPath = $filePath + ".backup"
            Copy-Item $filePath $backupPath
            Set-Content -Path $filePath -Value $fixedContent -Encoding UTF8
            Write-Host "[OK] Corrigé ($changes changements)" -ForegroundColor Green
            return "FIXED"
        } else {
            Write-Host "[OK] Déjà correct" -ForegroundColor Green
            return "OK"
        }
        
    } catch {
        Write-Host "[ERROR] Erreur: $_" -ForegroundColor Red
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
    $result = Fix-PS1Emojis $file.FullName
    
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
Write-Host ""
Write-Host "[REPORT] RAPPORT FINAL" -ForegroundColor Magenta
Write-Host "================" -ForegroundColor Gray
Write-Host "Total: $($ps1Files.Count)" -ForegroundColor White
Write-Host "[FIX] Corrigés: $fixedCount" -ForegroundColor Yellow
Write-Host "[OK] OK: $okCount" -ForegroundColor Green
Write-Host "[ERROR] Erreurs: $errorCount" -ForegroundColor Red

# Afficher les fichiers corrigés
if ($fixedCount -gt 0) {
    Write-Host ""
    Write-Host "[LIST] FICHIERS CORRIGÉS:" -ForegroundColor Magenta
    $results | Where-Object { $_.Status -eq "FIXED" } | ForEach-Object {
        Write-Host "[FIX] $($_.File)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[SUCCESS] CORRECTION TERMINÉE" -ForegroundColor Green 

