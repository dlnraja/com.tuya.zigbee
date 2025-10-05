# Script pour Organiser les Images Téléchargées
# Après génération via IA externe, ce script organise automatiquement

Write-Host "📁 ORGANISATION AUTOMATIQUE DES IMAGES TÉLÉCHARGÉES" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host ""

$ROOT = Get-Location
$DOWNLOADS = [Environment]::GetFolderPath("Downloads")
$DRIVERS_PATH = Join-Path $ROOT "drivers"

Write-Host "📂 Dossier Téléchargements: $DOWNLOADS" -ForegroundColor Gray
Write-Host "📂 Dossier Drivers: $DRIVERS_PATH" -ForegroundColor Gray
Write-Host ""

# Rechercher les images récentes dans Downloads
$recentImages = Get-ChildItem -Path $DOWNLOADS -Filter "*.png" | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-24) } |
    Sort-Object LastWriteTime -Descending

Write-Host "🔍 Images PNG trouvées (dernières 24h): $($recentImages.Count)" -ForegroundColor Yellow
Write-Host ""

if ($recentImages.Count -eq 0) {
    Write-Host "❌ Aucune image récente trouvée dans Downloads" -ForegroundColor Red
    Write-Host "Téléchargez d'abord les images depuis l'IA" -ForegroundColor Yellow
    exit
}

# Afficher les images trouvées
Write-Host "Images détectées:" -ForegroundColor Green
foreach ($img in $recentImages | Select-Object -First 10) {
    Write-Host "  - $($img.Name) ($($img.Length) bytes)" -ForegroundColor Gray
}
Write-Host ""

# Demander confirmation
$confirm = Read-Host "Organiser ces images automatiquement? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "❌ Annulé par l'utilisateur" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🔄 Organisation en cours..." -ForegroundColor Cyan
Write-Host ""

# Pattern de nommage attendu: drivername_75.png ou drivername_500.png
$organized = 0
$errors = 0

foreach ($img in $recentImages) {
    $filename = $img.Name
    
    # Détecter pattern: <driver>_<size>.png
    if ($filename -match '^(.+)_(75|500)\.png$') {
        $driverName = $matches[1]
        $size = $matches[2]
        
        $sizeLabel = if ($size -eq "75") { "small" } else { "large" }
        $driverPath = Join-Path $DRIVERS_PATH $driverName
        $assetsPath = Join-Path $driverPath "assets"
        $targetPath = Join-Path $assetsPath "$sizeLabel.png"
        
        # Vérifier si le driver existe
        if (Test-Path $driverPath) {
            # Créer le dossier assets si nécessaire
            if (!(Test-Path $assetsPath)) {
                New-Item -ItemType Directory -Path $assetsPath -Force | Out-Null
            }
            
            # Copier l'image
            Copy-Item -Path $img.FullName -Destination $targetPath -Force
            Write-Host "✅ $driverName/$sizeLabel.png" -ForegroundColor Green
            $organized++
        } else {
            Write-Host "⚠️  Driver introuvable: $driverName" -ForegroundColor Yellow
            $errors++
        }
    }
}

Write-Host ""
Write-Host "=" * 70
Write-Host "📊 RÉSUMÉ" -ForegroundColor Cyan
Write-Host "✅ Images organisées: $organized" -ForegroundColor Green
Write-Host "⚠️  Erreurs: $errors" -ForegroundColor Yellow
Write-Host ""

if ($organized -gt 0) {
    Write-Host "🔍 Validation des assets..." -ForegroundColor Cyan
    Set-Location $ROOT
    node tools/verify_driver_assets_v38.js
    
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "1. Vérifier le rapport: project-data/asset_size_report_v38.json"
    Write-Host "2. Commit: git add drivers/*/assets/"
    Write-Host "3. Push: git commit -m 'Assets IA générés' && git push"
}
