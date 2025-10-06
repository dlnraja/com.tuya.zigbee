# ============================================================================
# FINAL CLEANUP - Nettoyage final complet de la racine
# ============================================================================

Write-Host "🧹 NETTOYAGE FINAL - DEBUT" -ForegroundColor Cyan

$rootPath = "c:\Users\HP\Desktop\tuya_repair"
$cleaned = 0

# S'assurer que les dossiers de destination existent
$destinations = @{
    "references/reports" = @(
        "AUTONOMOUS_COMPLETE_FINAL_REPORT.md",
        "CHANGELOG_v2.0.0.md",
        "COHERENCE_VALIDATION_REPORT.md",
        "COMMUNITY_INTEGRATION_COMPLETE.md",
        "COMPLETE_FIX_REPORT.md",
        "CRITICAL_HOTFIX_v2.0.5.md",
        "FINAL_SUCCESS_REPORT.md",
        "GITHUB_INTEGRATION_REPORT.md",
        "HOMEY_PUBLISH_INSTRUCTIONS.md",
        "MASSIVE_ENRICHMENT_REPORT.md",
        "PUBLICATION_READY_REPORT.md",
        "ULTIMATE_REOPTIMIZATION_FINAL.md",
        "ULTRA_PRECISE_CATEGORIZATION_REPORT.md",
        "validation_report.json"
    )
    "backup_complete/archives" = @()
}

# Déplacer les fichiers de rapports
foreach ($dest in $destinations.Keys) {
    $destPath = Join-Path $rootPath $dest
    if (-not (Test-Path $destPath)) {
        New-Item -Path $destPath -ItemType Directory -Force | Out-Null
    }
    
    foreach ($file in $destinations[$dest]) {
        $sourcePath = Join-Path $rootPath $file
        if (Test-Path $sourcePath) {
            try {
                Move-Item -Path $sourcePath -Destination $destPath -Force
                Write-Host "✅ Deplace: $file → $dest" -ForegroundColor Green
                $cleaned++
            } catch {
                Write-Host "⚠ Erreur: $file" -ForegroundColor Yellow
            }
        }
    }
}

# Déplacer archive/ vers backup_complete/
$archivePath = Join-Path $rootPath "archive"
if (Test-Path $archivePath) {
    $backupArchivePath = Join-Path $rootPath "backup_complete/old_archive"
    if (-not (Test-Path $backupArchivePath)) {
        New-Item -Path $backupArchivePath -ItemType Directory -Force | Out-Null
    }
    try {
        Move-Item -Path $archivePath -Destination $backupArchivePath -Force
        Write-Host "✅ Deplace: archive/ → backup_complete/old_archive" -ForegroundColor Green
        $cleaned++
    } catch {
        Write-Host "⚠ Erreur deplacement archive/" -ForegroundColor Yellow
    }
}

# Déplacer scripts/ vide s'il existe
$scriptsPath = Join-Path $rootPath "scripts"
if ((Test-Path $scriptsPath) -and ((Get-ChildItem $scriptsPath).Count -eq 0)) {
    Remove-Item -Path $scriptsPath -Force
    Write-Host "🗑 Supprime: scripts/ (vide)" -ForegroundColor Magenta
    $cleaned++
}

# Nettoyer .external_sources s'il est vide
$externalSourcesPath = Join-Path $rootPath ".external_sources"
if ((Test-Path $externalSourcesPath) -and ((Get-ChildItem $externalSourcesPath).Count -eq 0)) {
    Remove-Item -Path $externalSourcesPath -Force
    Write-Host "🗑 Supprime: .external_sources/ (vide)" -ForegroundColor Magenta
    $cleaned++
}

# Vérifier que README.txt n'existe pas à la racine (déjà déplacé)
$readmeTxtPath = Join-Path $rootPath "README.txt"
if (Test-Path $readmeTxtPath) {
    $destReadmeTxt = Join-Path $rootPath "references/documentation/README.txt"
    Move-Item -Path $readmeTxtPath -Destination $destReadmeTxt -Force
    Write-Host "✅ Deplace: README.txt → references/documentation/" -ForegroundColor Green
    $cleaned++
}

Write-Host "`n📊 STRUCTURE FINALE RACINE:" -ForegroundColor Cyan
Write-Host "Fichiers essentiels:" -ForegroundColor White
$essentialFiles = @(
    ".gitignore",
    ".homeychangelog.json", 
    ".homeyignore",
    ".prettierignore",
    ".prettierrc",
    "README.md",
    "app.json",
    "package.json",
    "package-lock.json"
)
foreach ($file in $essentialFiles) {
    $filePath = Join-Path $rootPath $file
    if (Test-Path $filePath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (MANQUANT)" -ForegroundColor Red
    }
}

Write-Host "`nDossiers principaux:" -ForegroundColor White
$mainFolders = @(
    "drivers",
    "tools",
    "references",
    "project-data",
    "ultimate_system",
    ".github",
    "settings",
    "assets",
    "catalog"
)
foreach ($folder in $mainFolders) {
    $folderPath = Join-Path $rootPath $folder
    if (Test-Path $folderPath) {
        $itemCount = (Get-ChildItem $folderPath -Recurse).Count
        Write-Host "  ✅ $folder/ ($itemCount items)" -ForegroundColor Green
    }
}

Write-Host "`n🎉 NETTOYAGE FINAL TERMINE - $cleaned fichiers traites" -ForegroundColor Green
Write-Host "✅ Structure racine professionnelle optimale" -ForegroundColor Green
