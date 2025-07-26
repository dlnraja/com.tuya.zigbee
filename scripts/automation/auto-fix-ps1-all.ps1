
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Auto Fix PS1 All - Granularité par phase/type
# PHASE 1 : Correction automatique de tous les scripts PowerShell

Write-Host "[FIX] AUTO-FIX DE TOUS LES SCRIPTS PS1 - PHASE 1" -ForegroundColor Green

# Liste des emojis/icônes à supprimer/remplacer
$emojiReplacements = @{
    '🚀' = ''
    '🔧' = ''
    '✅' = ''
    '❌' = ''
    '⚠️' = ''
    '📊' = ''
    '📋' = ''
    '🎉' = ''
    '🔄' = ''
    '📁' = ''
    '📄' = ''
    '🔗' = ''
    '⚡' = ''
    '🛡️' = ''
    '🎯' = ''
    '📈' = ''
    '📉' = ''
    '💡' = ''
    '🔍' = ''
    '📝' = ''
    '⏱️' = ''
    '📅' = ''
    '🌍' = ''
    '🇫🇷' = ''
    '🇬🇧' = ''
    '🇹🇦' = ''
    '🇳🇱' = ''
    '🇩🇪' = ''
    '🇪🇸' = ''
    '🇮🇹' = ''
    '🇷🇺' = ''
    '🇵🇱' = ''
    '🇵🇹' = ''
}

# Correction des variables .Name/.FullName
function Fix-Variables($content) {
    $content = $content -replace '\.Name', '$_\.Name'
    $content = $content -replace '\.FullName', '$_\.FullName'
    return $content
}

# Correction des caractères d’échappement
function Fix-Escapes($content) {
    $content = $content -replace '\\\$', '$'
    $content = $content -replace '\\\\\(', '('
    $content = $content -replace '\\\\\)', ')'
    $content = $content -replace '\\\\\{', '{'
    $content = $content -replace '\\\\\}', '}'
    return $content
}

# Correction des encodages
function Fix-Encoding($content) {
    $content = $content -replace '�', 'e'
    $content = $content -replace 'Ã©', 'é'
    $content = $content -replace 'Ã¨', 'è'
    $content = $content -replace 'Ã', 'à'
    $content = $content -replace 'Ãª', 'ê'
    $content = $content -replace 'Ã´', 'ô'
    $content = $content -replace 'Ã»', 'û'
    $content = $content -replace 'Ã§', 'ç'
    $content = $content -replace 'Ã¹', 'ù'
    $content = $content -replace 'Ã€', 'À'
    $content = $content -replace 'Ã‰', 'É'
    $content = $content -replace 'Ã¨', 'è'
    $content = $content -replace 'Ãª', 'ê'
    $content = $content -replace 'Ã«', 'ë'
    $content = $content -replace 'Ã¯', 'ï'
    $content = $content -replace 'Ã´', 'ô'
    $content = $content -replace 'Ã¶', 'ö'
    $content = $content -replace 'Ã¹', 'ù'
    $content = $content -replace 'Ã¼', 'ü'
    return $content
}

# Exécution principale
$ps1Files = Get-ChildItem scripts -Filter "*.ps1" -Recurse
$results = @()
$fixedCount = 0
$okCount = 0

foreach ($file in $ps1Files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    $changes = 0

    # Suppression/remplacement emojis/icônes
    foreach ($emoji in $emojiReplacements.Keys) {
        if ($content -match [regex]::Escape($emoji)) {
            $content = $content -replace [regex]::Escape($emoji), $emojiReplacements[$emoji]
            $changes++
        }
    }
    # Correction variables
    $fixedVars = Fix-Variables $content
    if ($fixedVars -ne $content) { $content = $fixedVars; $changes++ }
    # Correction échappements
    $fixedEsc = Fix-Escapes $content
    if ($fixedEsc -ne $content) { $content = $fixedEsc; $changes++ }
    # Correction encodages
    $fixedEnc = Fix-Encoding $content
    if ($fixedEnc -ne $content) { $content = $fixedEnc; $changes++ }

    if ($content -ne $original) {
        $backupPath = $file.FullName + ".backup"
        Copy-Item $file.FullName $backupPath -Force
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        $fixedCount++
        $results += "[FIXED] $($file.Name)"
    } else {
        $okCount++
        $results += "[OK] $($file.Name)"
    }
}

# Rapport
$report = "[REPORT] Correction PS1 : $fixedCount corrigés, $okCount inchangés."
$report += "`n" + ($results -join "`n")
Set-Content -Path "docs/reports/ps1-fix-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').md" -Value $report -Encoding UTF8
Write-Host $report -ForegroundColor Cyan
Write-Host "[SUCCESS] PHASE 1 TERMINÉE" -ForegroundColor Green 
