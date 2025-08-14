Write-Host "🔄 RESTAURATION COMPLÈTE DU DOSSIER TUYA v3.4.1..." -ForegroundColor Green

# Chemins
$projectRoot = Get-Location
$driversPath = Join-Path $projectRoot "drivers"
$tuyaPath = Join-Path $driversPath "tuya"
$backupPath = Join-Path $projectRoot ".backup\drivers-snap\tuya"

Write-Host "📁 Création de la structure Tuya..." -ForegroundColor Yellow

# Créer le dossier principal tuya
if (!(Test-Path $tuyaPath)) {
    New-Item -ItemType Directory -Path $tuyaPath -Force
    Write-Host "✅ Dossier Tuya créé" -ForegroundColor Green
}

# Créer les catégories
$categories = @('light', 'switch', 'sensor-motion', 'sensor-contact', 'siren', 'lock', 'cover', 'climate-thermostat', 'plug')

foreach ($category in $categories) {
    $categoryPath = Join-Path $tuyaPath $category
    if (!(Test-Path $categoryPath)) {
        New-Item -ItemType Directory -Path $categoryPath -Force
    }
    
    $vendorPath = Join-Path $categoryPath "tuya"
    if (!(Test-Path $vendorPath)) {
        New-Item -ItemType Directory -Path $vendorPath -Force
    }
    
    Write-Host "  📁 Créé: $category\tuya\" -ForegroundColor Cyan
}

Write-Host "🚗 Restauration des drivers depuis le backup..." -ForegroundColor Yellow

# Restaurer depuis le backup
if (Test-Path $backupPath) {
    $backupCategories = Get-ChildItem $backupPath -Directory
    
    foreach ($backupCategory in $backupCategories) {
        $categoryName = $backupCategory.Name
        $targetCategoryPath = Join-Path $tuyaPath $categoryName
        
        if (!(Test-Path $targetCategoryPath)) {
            New-Item -ItemType Directory -Path $targetCategoryPath -Force
        }
        
        $targetVendorPath = Join-Path $targetCategoryPath "tuya"
        if (!(Test-Path $targetVendorPath)) {
            New-Item -ItemType Directory -Path $targetVendorPath -Force
        }
        
        $backupVendorPath = Join-Path $backupCategory.FullName "tuya"
        if (Test-Path $backupVendorPath) {
            $drivers = Get-ChildItem $backupVendorPath -Directory
            
            foreach ($driver in $drivers) {
                $driverName = $driver.Name
                $targetDriverPath = Join-Path $targetVendorPath $driverName
                
                if (!(Test-Path $targetDriverPath)) {
                    New-Item -ItemType Directory -Path $targetDriverPath -Force
                }
                
                # Copier les fichiers
                $files = Get-ChildItem $driver.FullName -Recurse
                foreach ($file in $files) {
                    $relativePath = $file.FullName.Substring($driver.FullName.Length + 1)
                    $targetFile = Join-Path $targetDriverPath $relativePath
                    
                    if ($file.PSIsContainer) {
                        if (!(Test-Path $targetFile)) {
                            New-Item -ItemType Directory -Path $targetFile -Force
                        }
                    } else {
                        $targetDir = Split-Path $targetFile -Parent
                        if (!(Test-Path $targetDir)) {
                            New-Item -ItemType Directory -Path $targetDir -Force
                        }
                        Copy-Item $file.FullName $targetFile -Force
                    }
                }
                
                Write-Host "    🔄 Restauré: $categoryName\tuya\$driverName" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "⚠️ Dossier backup non trouvé: $backupPath" -ForegroundColor Yellow
}

Write-Host "🎨 Création des assets manquants..." -ForegroundColor Yellow

# Créer des assets de base pour tous les drivers
$allDrivers = Get-ChildItem $tuyaPath -Recurse -Directory | Where-Object { $_.Name -ne "tuya" }

foreach ($driver in $allDrivers) {
    $driverPath = $driver.FullName
    $driverName = $driver.Name
    
    # Créer assets si manquant
    $assetsPath = Join-Path $driverPath "assets"
    if (!(Test-Path $assetsPath)) {
        New-Item -ItemType Directory -Path $assetsPath -Force
        
        $imagesPath = Join-Path $assetsPath "images"
        New-Item -ItemType Directory -Path $imagesPath -Force
        
        # Créer icône SVG simple
        $iconContent = @"
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="white"/>
  <circle cx="128" cy="128" r="100" fill="#007bff" stroke="#0056b3" stroke-width="8"/>
  <text x="128" y="140" text-anchor="middle" font-family="Arial" font-size="48" fill="white">$($driverName[0].ToString().ToUpper())</text>
</svg>
"@
        
        $iconPath = Join-Path $assetsPath "icon.svg"
        $iconContent | Out-File -FilePath $iconPath -Encoding UTF8
        
        # Créer images SVG simples
        $sizes = @(75, 500, 1000)
        $names = @("small.png", "large.png", "xlarge.png")
        
        for ($i = 0; $i -lt $sizes.Length; $i++) {
            $size = $sizes[$i]
            $name = $names[$i]
            
            $imageContent = @"
<svg width="$size" height="$size" viewBox="0 0 $size $size" xmlns="http://www.w3.org/2000/svg">
  <rect width="$size" height="$size" fill="white"/>
  <circle cx="$($size/2)" cy="$($size/2)" r="$($size/3)" fill="#007bff" stroke="#0056b3" stroke-width="$([Math]::Max(1, $size/100))"/>
  <text x="$($size/2)" y="$($size/2 + $size/20)" text-anchor="middle" font-family="Arial" font-size="$($size/8)" fill="white">$($driverName[0].ToString().ToUpper())</text>
</svg>
"@
            
            $imagePath = Join-Path $imagesPath $name
            $imageContent | Out-File -FilePath $imagePath -Encoding UTF8
        }
        
        Write-Host "      🎨 Assets créés pour: $driverName" -ForegroundColor Cyan
    }
}

Write-Host "✅ RESTAURATION COMPLÈTE TERMINÉE !" -ForegroundColor Green

# Afficher le résumé
$totalDrivers = (Get-ChildItem $tuyaPath -Recurse -Directory | Where-Object { $_.Name -ne "tuya" }).Count
Write-Host "📊 Total drivers restaurés: $totalDrivers" -ForegroundColor Magenta

Write-Host "🔍 Vérification de la structure..." -ForegroundColor Yellow
Get-ChildItem $tuyaPath -Directory | ForEach-Object {
    $category = $_.Name
    $drivers = Get-ChildItem (Join-Path $_.FullName "tuya") -Directory -ErrorAction SilentlyContinue
    $count = if ($drivers) { $drivers.Count } else { 0 }
    Write-Host "  📁 $category`: $count drivers" -ForegroundColor Cyan
}
