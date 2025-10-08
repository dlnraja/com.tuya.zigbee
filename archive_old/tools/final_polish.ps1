# ============================================================================
# FINAL POLISH - Nettoyage et polissage final
# ============================================================================

Write-Host "✨ FINAL POLISH - Optimisation finale" -ForegroundColor Cyan

$rootPath = "c:\Users\HP\Desktop\tuya_repair"
$cleaned = 0

# Déplacer archives/ vers backup_complete/
$archivesPath = Join-Path $rootPath "archives"
if (Test-Path $archivesPath) {
    $backupArchivesPath = Join-Path $rootPath "backup_complete/archives"
    if (-not (Test-Path $backupArchivesPath)) {
        New-Item -Path $backupArchivesPath -ItemType Directory -Force | Out-Null
    }
    try {
        Get-ChildItem $archivesPath | Move-Item -Destination $backupArchivesPath -Force
        Remove-Item -Path $archivesPath -Force
        Write-Host "✅ Deplace: archives/* → backup_complete/archives/" -ForegroundColor Green
        $cleaned++
    } catch {
        Write-Host "⚠ Erreur deplacement archives/" -ForegroundColor Yellow
    }
}

# Supprimer dossiers vides
$emptyFolders = @(".external_sources", "scripts")
foreach ($folder in $emptyFolders) {
    $folderPath = Join-Path $rootPath $folder
    if ((Test-Path $folderPath) -and ((Get-ChildItem $folderPath -Force).Count -eq 0)) {
        Remove-Item -Path $folderPath -Force
        Write-Host "🗑 Supprime: $folder/ (vide)" -ForegroundColor Magenta
        $cleaned++
    }
}

# Nettoyer cache Homey
$homeybuildPath = Join-Path $rootPath ".homeybuild"
if (Test-Path $homeybuildPath) {
    Remove-Item -Path $homeybuildPath -Recurse -Force
    Write-Host "🧹 Cache .homeybuild nettoye" -ForegroundColor Yellow
}

$homeycomposePath = Join-Path $rootPath ".homeycompose"
if (Test-Path $homeycomposePath) {
    Remove-Item -Path $homeycomposePath -Recurse -Force
    Write-Host "🧹 Cache .homeycompose nettoye" -ForegroundColor Yellow
}

# Vérifier structure finale
Write-Host "`n📊 VERIFICATION STRUCTURE FINALE:" -ForegroundColor Cyan

$rootFiles = Get-ChildItem $rootPath -File | Where-Object { $_.Name -notmatch '^\.env$' }
$essentialFiles = @(
    ".gitignore", ".homeychangelog.json", ".homeyignore",
    ".prettierignore", ".prettierrc", "README.md",
    "app.json", "package.json", "package-lock.json"
)

Write-Host "`nFichiers racine:" -ForegroundColor White
foreach ($file in $rootFiles) {
    if ($file.Name -in $essentialFiles) {
        Write-Host "  ✅ $($file.Name) (essentiel)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $($file.Name) (non essentiel)" -ForegroundColor Yellow
    }
}

Write-Host "`nDossiers racine:" -ForegroundColor White
$rootDirs = Get-ChildItem $rootPath -Directory | Where-Object { 
    $_.Name -notmatch '^\.' -and $_.Name -ne 'node_modules' 
}
foreach ($dir in $rootDirs) {
    $itemCount = (Get-ChildItem $dir.FullName -Recurse -ErrorAction SilentlyContinue).Count
    Write-Host "  📁 $($dir.Name)/ ($itemCount items)" -ForegroundColor Cyan
}

Write-Host "`n✅ FINAL POLISH TERMINE - $cleaned operations" -ForegroundColor Green
Write-Host "🎯 Structure professionnelle optimale atteinte" -ForegroundColor Green
