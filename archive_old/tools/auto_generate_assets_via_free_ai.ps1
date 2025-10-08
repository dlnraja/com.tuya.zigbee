# Script d'Automatisation de Génération d'Assets via IA Gratuites
# Utilise des services gratuits accessibles sans clé API

Write-Host "🎨 GÉNÉRATION AUTOMATIQUE D'ASSETS VIA IA GRATUITES" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host ""

# Configuration
$ROOT = Get-Location
$DRIVERS_PATH = Join-Path $ROOT "drivers"
$CATEGORIES_PATH = Join-Path $ROOT "catalog\categories.json"

# Charger les catégories
$categories = Get-Content $CATEGORIES_PATH | ConvertFrom-Json

# Couleurs par catégorie (design Homey)
$categoryColors = @{
    "motion" = "#4CAF50"  # Vert
    "climate" = "#FF9800"  # Orange
    "light" = "#FFC107"    # Ambre
    "power" = "#F44336"    # Rouge
    "switch" = "#9C27B0"   # Violet
    "cover" = "#00BCD4"    # Cyan
    "security" = "#795548" # Marron
    "sensor" = "#2196F3"   # Bleu
}

# Fonction pour déterminer la catégorie d'un driver
function Get-DriverCategory {
    param($driverId)
    
    if ($driverId -match "motion|pir|presence|radar") { return "motion" }
    if ($driverId -match "temp|humid|climate|thermostat|valve") { return "climate" }
    if ($driverId -match "light|bulb|dimmer|rgb|led|strip") { return "light" }
    if ($driverId -match "plug|socket|outlet|power|energy") { return "power" }
    if ($driverId -match "switch|relay|gang|button|scene") { return "switch" }
    if ($driverId -match "curtain|blind|shutter|shade|motor") { return "cover" }
    if ($driverId -match "lock|doorbell|alarm|siren") { return "security" }
    if ($driverId -match "sensor|detector|monitor") { return "sensor" }
    
    return "sensor" # Default
}

# Fonction pour générer un prompt DALL-E optimisé
function Get-ImagePrompt {
    param($driverId, $category, $size)
    
    $color = $categoryColors[$category]
    $deviceType = $driverId -replace "_", " "
    
    $basePrompt = @"
Flat icon design for smart home device: $deviceType
Style: Minimalist, centered silhouette
Background: Radial gradient from $color to transparent
Size: ${size}x${size} pixels
Format: PNG with transparency
Design: Professional Homey app aesthetic, no text, clean lines
Theme: IoT/smart home device icon
"@
    
    return $basePrompt
}

Write-Host "📋 Méthodes de Génération Disponibles:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. DALL-E 3 via Bing Image Creator (GRATUIT)" -ForegroundColor Green
Write-Host "   URL: https://www.bing.com/images/create"
Write-Host "   Limite: Gratuit avec compte Microsoft"
Write-Host ""
Write-Host "2. Craiyon (anciennement DALL-E mini) (GRATUIT)" -ForegroundColor Green
Write-Host "   URL: https://www.craiyon.com"
Write-Host "   Limite: Gratuit avec publicités"
Write-Host ""
Write-Host "3. Stable Diffusion Online (GRATUIT)" -ForegroundColor Green
Write-Host "   URL: https://stablediffusionweb.com"
Write-Host "   Limite: Gratuit avec limitations"
Write-Host ""
Write-Host "4. Leonardo AI (GRATUIT)" -ForegroundColor Green
Write-Host "   URL: https://leonardo.ai"
Write-Host "   Limite: 150 crédits gratuits/jour"
Write-Host ""

$method = Read-Host "Choisir méthode (1-4)"

switch ($method) {
    "1" {
        Write-Host ""
        Write-Host "🎨 Génération via DALL-E 3 (Bing)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Instructions:" -ForegroundColor Yellow
        Write-Host "1. Ouvrir: https://www.bing.com/images/create"
        Write-Host "2. Se connecter avec compte Microsoft"
        Write-Host "3. Copier les prompts générés ci-dessous"
        Write-Host "4. Télécharger les images (75x75 et 500x500)"
        Write-Host "5. Les placer dans drivers/<driver>/assets/"
        Write-Host ""
        
        # Générer liste de prompts
        $drivers = Get-ChildItem -Path $DRIVERS_PATH -Directory | Select-Object -First 5
        
        Write-Host "📝 PROMPTS GÉNÉRÉS (5 premiers drivers):" -ForegroundColor Green
        Write-Host ""
        
        foreach ($driver in $drivers) {
            $category = Get-DriverCategory $driver.Name
            $prompt75 = Get-ImagePrompt $driver.Name $category 75
            $prompt500 = Get-ImagePrompt $driver.Name $category 500
            
            Write-Host "Driver: $($driver.Name)" -ForegroundColor Cyan
            Write-Host "Catégorie: $category" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Prompt (75x75):" -ForegroundColor Yellow
            Write-Host $prompt75
            Write-Host ""
            Write-Host "Prompt (500x500):" -ForegroundColor Yellow
            Write-Host $prompt500
            Write-Host ""
            Write-Host "-" * 70
            Write-Host ""
        }
        
        # Sauvegarder tous les prompts dans un fichier
        $promptsFile = Join-Path $ROOT "project-data\image_generation_prompts.txt"
        $allDrivers = Get-ChildItem -Path $DRIVERS_PATH -Directory
        
        $promptsContent = @()
        $promptsContent += "# PROMPTS DE GÉNÉRATION D'IMAGES - DALL-E 3"
        $promptsContent += "# Généré: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        $promptsContent += ""
        
        foreach ($driver in $allDrivers) {
            $category = Get-DriverCategory $driver.Name
            $prompt75 = Get-ImagePrompt $driver.Name $category 75
            $prompt500 = Get-ImagePrompt $driver.Name $category 500
            
            $promptsContent += "=" * 70
            $promptsContent += "DRIVER: $($driver.Name)"
            $promptsContent += "CATÉGORIE: $category"
            $promptsContent += "COULEUR: $($categoryColors[$category])"
            $promptsContent += ""
            $promptsContent += "--- SMALL (75x75) ---"
            $promptsContent += $prompt75
            $promptsContent += ""
            $promptsContent += "--- LARGE (500x500) ---"
            $promptsContent += $prompt500
            $promptsContent += ""
        }
        
        $promptsContent | Out-File -FilePath $promptsFile -Encoding UTF8
        
        Write-Host "✅ Tous les prompts sauvegardés:" -ForegroundColor Green
        Write-Host $promptsFile
        Write-Host ""
        Write-Host "📋 Vous pouvez maintenant:" -ForegroundColor Yellow
        Write-Host "1. Ouvrir le fichier de prompts"
        Write-Host "2. Copier chaque prompt dans Bing Image Creator"
        Write-Host "3. Télécharger les images générées"
        Write-Host "4. Renommer et placer dans drivers/<driver>/assets/"
    }
    
    "2" {
        Write-Host ""
        Write-Host "🎨 Génération via Craiyon" -ForegroundColor Cyan
        Write-Host ""
        Start-Process "https://www.craiyon.com"
        Write-Host "✅ Navigateur ouvert sur Craiyon.com" -ForegroundColor Green
    }
    
    "3" {
        Write-Host ""
        Write-Host "🎨 Génération via Stable Diffusion" -ForegroundColor Cyan
        Write-Host ""
        Start-Process "https://stablediffusionweb.com"
        Write-Host "✅ Navigateur ouvert sur StableDiffusionWeb.com" -ForegroundColor Green
    }
    
    "4" {
        Write-Host ""
        Write-Host "🎨 Génération via Leonardo AI" -ForegroundColor Cyan
        Write-Host ""
        Start-Process "https://leonardo.ai"
        Write-Host "✅ Navigateur ouvert sur Leonardo.ai" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=" * 70
Write-Host "🎨 SCRIPT TERMINÉ" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Générer les images via l'IA choisie"
Write-Host "2. Placer les images dans drivers/<driver>/assets/"
Write-Host "3. Valider: node tools/verify_driver_assets_v38.js"
Write-Host "4. Commit: git add assets/ drivers/*/assets/"
Write-Host "5. Publish: pwsh -File tools/prepare_local_publish.ps1"
Write-Host ""
