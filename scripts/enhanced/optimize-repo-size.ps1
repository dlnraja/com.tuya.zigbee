
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# OPTIMIZE REPO SIZE - Tuya Zigbee Project
# Script pour réduire drastiquement la taille du repository

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

Write-Host "OPTIMIZE REPO SIZE - RÉDUCTION DRASTIQUE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Variables globales
$originalSize = 0
$optimizedSize = 0
$filesRemoved = 0
$filesOptimized = 0

# Fonction pour obtenir la taille d'un dossier
function Get-FolderSize {
    param($path)
    $size = 0
    Get-ChildItem -Path $path -Recurse -File | ForEach-Object {
        $size += $_.Length
    }
    return $size
}

# Fonction pour optimiser un fichier
function Optimize-File {
    param($filePath)
    
    $extension = [System.IO.Path]::GetExtension($filePath)
    $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { return $false }
    
    $originalSize = $content.Length
    $optimized = $false
    
    # Optimiser les fichiers JavaScript
    if ($extension -eq ".js") {
        # Supprimer les commentaires longs
        $content = $content -replace '/\*.*?\*/', '' -replace '//.*$', ''
        # Supprimer les lignes vides multiples
        $content = $content -replace '\n\s*\n\s*\n', "`n`n"
        $optimized = $true
    }
    
    # Optimiser les fichiers JSON
    if ($extension -eq ".json") {
        try {
            $json = $content | ConvertFrom-Json
            $content = $json | ConvertTo-Json -Compress -Depth 10
            $optimized = $true
        } catch {
            # Ignorer les erreurs JSON
        }
    }
    
    # Optimiser les fichiers YAML
    if ($extension -eq ".yml" -or $extension -eq ".yaml") {
        # Supprimer les commentaires
        $content = $content -replace '#.*$', ''
        # Supprimer les lignes vides
        $content = $content -replace '\n\s*\n', "`n"
        $optimized = $true
    }
    
    # Optimiser les fichiers Markdown
    if ($extension -eq ".md") {
        # Supprimer les sections redondantes
        $content = $content -replace '##.*?##.*?##', '##'
        # Supprimer les listes trop longues
        $content = $content -replace '(\n- .*\n){10,}', "`n- ... (liste tronquée)`n"
        $optimized = $true
    }
    
    # Optimiser les fichiers PowerShell
    if ($extension -eq ".ps1") {
        # Supprimer les commentaires longs
        $content = $content -replace '#.*$', ''
        # Supprimer les lignes vides multiples
        $content = $content -replace '\n\s*\n\s*\n', "`n`n"
        $optimized = $true
    }
    
    if ($optimized) {
        Set-Content -Path $filePath -Value $content -Encoding UTF8
        $newSize = $content.Length
        $reduction = $originalSize - $newSize
        Write-Host "  ✅ $([System.IO.Path]::GetFileName($filePath)) - Réduit de $reduction bytes" -ForegroundColor Green
        return $true
    }
    
    return $false
}

# 1. Nettoyage des fichiers temporaires
Write-Host "1. NETTOYAGE DES FICHIERS TEMPORAIRES" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

# Supprimer les fichiers temporaires
$tempFiles = @(
    "*.tmp",
    "*.log",
    "*.cache",
    "*.bak",
    "*.old",
    "*.backup"
)

foreach ($pattern in $tempFiles) {
    $files = Get-ChildItem -Path "." -Recurse -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Remove-Item $file.FullName -Force
        $filesRemoved++
        Write-Host "  🗑️ Supprimé: $($file.Name)" -ForegroundColor Red
    }
}

# 2. Optimisation Git
Write-Host "`n2. OPTIMISATION GIT" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

# Nettoyage Git agressif
Write-Host "  🔧 Nettoyage Git agressif..." -ForegroundColor Yellow
git gc --aggressive --prune=now --force
git repack -a -d --depth=1 --window=1
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 3. Optimisation des fichiers
Write-Host "`n3. OPTIMISATION DES FICHIERS" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

$fileTypes = @("*.js", "*.json", "*.yml", "*.yaml", "*.md", "*.ps1")
$totalFiles = 0

foreach ($pattern in $fileTypes) {
    $files = Get-ChildItem -Path "." -Recurse -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $totalFiles++
        if (Optimize-File -filePath $file.FullName) {
            $filesOptimized++
        }
    }
}

# 4. Suppression des fichiers volumineux non essentiels
Write-Host "`n4. SUPPRESSION DES FICHIERS VOLUMINEUX" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

# Supprimer les fichiers volumineux non essentiels
$largeFiles = @(
    "*.zip",
    "*.tar.gz",
    "*.rar",
    "*.7z",
    "*.iso",
    "*.img",
    "*.bin"
)

foreach ($pattern in $largeFiles) {
    $files = Get-ChildItem -Path "." -Recurse -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        if ($file.Length -gt 1MB) {
            Remove-Item $file.FullName -Force
            $filesRemoved++
            Write-Host "  🗑️ Fichier volumineux supprimé: $($file.Name) ($([math]::Round($file.Length / 1MB, 2)) MB)" -ForegroundColor Red
        }
    }
}

# 5. Optimisation des images
Write-Host "`n5. OPTIMISATION DES IMAGES" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Supprimer les images non optimisées
$imageFiles = Get-ChildItem -Path "." -Recurse -Include "*.png", "*.jpg", "*.jpeg", "*.gif", "*.bmp" -ErrorAction SilentlyContinue
foreach ($image in $imageFiles) {
    if ($image.Length -gt 100KB) {
        Remove-Item $image.FullName -Force
        $filesRemoved++
        Write-Host "  🗑️ Image volumineuse supprimée: $($image.Name) ($([math]::Round($image.Length / 1KB, 2)) KB)" -ForegroundColor Red
    }
}

# 6. Nettoyage des dossiers
Write-Host "`n6. NETTOYAGE DES DOSSIERS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Supprimer les dossiers non essentiels
$foldersToRemove = @(
    "node_modules",
    ".git/objects/pack",
    "dist",
    "build",
    "coverage",
    ".nyc_output"
)

foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item $folder -Recurse -Force
        Write-Host "  🗑️ Dossier supprimé: $folder" -ForegroundColor Red
    }
}

# 7. Optimisation finale Git
Write-Host "`n7. OPTIMISATION FINALE GIT" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Optimisation finale
git add .
git commit -m "🔧 OPTIMIZATION: Réduction drastique de la taille du repository" --allow-empty
git gc --aggressive --prune=now
git repack -a -d --depth=1 --window=1

# 8. Rapport final
Write-Host "`n8. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

$originalSize = Get-FolderSize -path "."
$optimizedSize = Get-FolderSize -path "."

Write-Host "📊 STATISTIQUES:" -ForegroundColor White
Write-Host "- Fichiers supprimés: $filesRemoved" -ForegroundColor Red
Write-Host "- Fichiers optimisés: $filesOptimized" -ForegroundColor Green
Write-Host "- Taille originale: $([math]::Round($originalSize / 1MB, 2)) MB" -ForegroundColor White
Write-Host "- Taille optimisée: $([math]::Round($optimizedSize / 1MB, 2)) MB" -ForegroundColor Green
Write-Host "- Réduction: $([math]::Round(($originalSize - $optimizedSize) / 1MB, 2)) MB" -ForegroundColor Green

$reductionPercent = if ($originalSize -gt 0) { [math]::Round((($originalSize - $optimizedSize) / $originalSize) * 100, 2) } else { 0 }
Write-Host "- Réduction: $reductionPercent%" -ForegroundColor Green

Write-Host "`nOPTIMIZE REPO SIZE TERMINÉ!" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green
Write-Host "Repository optimisé pour push GitHub" -ForegroundColor White 

