# Script de recherche interactive dans la base de données manufacturer
# Permet de rechercher par ID, marque, catégorie, driver, etc.

param(
    [string]$ManufacturerId,
    [string]$Brand,
    [string]$Category,
    [string]$Driver,
    [string]$Region,
    [switch]$Interactive
)

$dbPath = Join-Path $PSScriptRoot "MANUFACTURER_DATABASE.json"

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Base de données non trouvée: $dbPath" -ForegroundColor Red
    exit 1
}

$db = Get-Content $dbPath -Raw | ConvertFrom-Json

function Show-ProductDetails {
    param($Id, $Product)
    
    Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $($Product.brand) - $($Product.productName)" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    Write-Host "`n📋 Informations Générales" -ForegroundColor Yellow
    Write-Host "  Manufacturer ID  : $Id" -ForegroundColor Gray
    Write-Host "  Product ID       : $($Product.productId)" -ForegroundColor Gray
    Write-Host "  Catégorie        : $($Product.category)" -ForegroundColor Gray
    Write-Host "  Marque           : $($Product.brand)" -ForegroundColor Gray
    Write-Host "  Région           : $($Product.region)" -ForegroundColor Gray
    
    Write-Host "`n📝 Description" -ForegroundColor Yellow
    Write-Host "  $($Product.description)" -ForegroundColor White
    
    Write-Host "`n✨ Caractéristiques" -ForegroundColor Yellow
    foreach ($feature in $Product.features) {
        Write-Host "  • $feature" -ForegroundColor White
    }
    
    Write-Host "`n🔧 Technique" -ForegroundColor Yellow
    Write-Host "  Driver           : $($Product.driver)" -ForegroundColor Gray
    Write-Host "  Alimentation     : $($Product.powerSource)" -ForegroundColor Gray
    Write-Host "  Vérifié          : $(if ($Product.verified) { '✅ Oui' } else { '⚠️ Non' })" -ForegroundColor Gray
    
    if ($Product.batteryLife) {
        Write-Host "  Autonomie batterie: $($Product.batteryLife)" -ForegroundColor Gray
    }
    
    if ($Product.retailer) {
        Write-Host "  Revendeur        : $($Product.retailer)" -ForegroundColor Gray
    }
    
    if ($Product.technology) {
        Write-Host "  Technologie      : $($Product.technology)" -ForegroundColor Gray
    }
    
    if ($Product.maxLoad) {
        Write-Host "  Charge maximale  : $($Product.maxLoad)" -ForegroundColor Gray
    }
    
    if ($Product.certifications) {
        Write-Host "  Certifications   : $($Product.certifications -join ', ')" -ForegroundColor Gray
    }
    
    Write-Host ""
}

function Search-ByManufacturerId {
    param([string]$Id)
    
    $product = $db.manufacturers.$Id
    
    if ($product) {
        Show-ProductDetails -Id $Id -Product $product
        return 1
    } else {
        Write-Host "❌ Aucun produit trouvé pour l'ID: $Id" -ForegroundColor Red
        return 0
    }
}

function Search-ByBrand {
    param([string]$BrandName)
    
    $results = $db.manufacturers.PSObject.Properties | Where-Object {
        $_.Value.brand -like "*$BrandName*"
    }
    
    if ($results) {
        Write-Host "`n🔍 $($results.Count) produit(s) trouvé(s) pour la marque: $BrandName`n" -ForegroundColor Green
        
        foreach ($result in $results) {
            Write-Host "  • $($result.Value.brand) - $($result.Value.productName)" -ForegroundColor Cyan
            Write-Host "    ID: $($result.Name)" -ForegroundColor Gray
            Write-Host "    Catégorie: $($result.Value.category)" -ForegroundColor Gray
            Write-Host ""
        }
        
        return $results.Count
    } else {
        Write-Host "❌ Aucun produit trouvé pour la marque: $BrandName" -ForegroundColor Red
        return 0
    }
}

function Search-ByCategory {
    param([string]$CategoryName)
    
    $results = $db.manufacturers.PSObject.Properties | Where-Object {
        $_.Value.category -like "*$CategoryName*"
    }
    
    if ($results) {
        Write-Host "`n🔍 $($results.Count) produit(s) dans la catégorie: $CategoryName`n" -ForegroundColor Green
        
        $grouped = $results | Group-Object { $_.Value.brand } | Sort-Object Name
        
        foreach ($group in $grouped) {
            Write-Host "  [$($group.Name)]" -ForegroundColor Yellow
            foreach ($item in $group.Group) {
                Write-Host "    • $($item.Value.productName)" -ForegroundColor White
                Write-Host "      ID: $($item.Name) | Driver: $($item.Value.driver)" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
        return $results.Count
    } else {
        Write-Host "❌ Aucun produit trouvé dans la catégorie: $CategoryName" -ForegroundColor Red
        return 0
    }
}

function Search-ByDriver {
    param([string]$DriverName)
    
    $results = $db.manufacturers.PSObject.Properties | Where-Object {
        $_.Value.driver -eq $DriverName
    }
    
    if ($results) {
        Write-Host "`n🔍 $($results.Count) produit(s) utilisant le driver: $DriverName`n" -ForegroundColor Green
        
        foreach ($result in $results) {
            Write-Host "  • $($result.Value.brand) - $($result.Value.productName)" -ForegroundColor Cyan
            Write-Host "    ID: $($result.Name)" -ForegroundColor Gray
            Write-Host "    Product ID: $($result.Value.productId)" -ForegroundColor Gray
            Write-Host ""
        }
        
        return $results.Count
    } else {
        Write-Host "❌ Aucun produit trouvé pour le driver: $DriverName" -ForegroundColor Red
        return 0
    }
}

function Search-ByRegion {
    param([string]$RegionName)
    
    $results = $db.manufacturers.PSObject.Properties | Where-Object {
        $_.Value.region -like "*$RegionName*"
    }
    
    if ($results) {
        Write-Host "`n🔍 $($results.Count) produit(s) dans la région: $RegionName`n" -ForegroundColor Green
        
        $byCategory = $results | Group-Object { $_.Value.category } | Sort-Object Name
        
        foreach ($cat in $byCategory) {
            Write-Host "  [$($cat.Name)] ($($cat.Count) produits)" -ForegroundColor Yellow
        }
        
        Write-Host ""
        return $results.Count
    } else {
        Write-Host "❌ Aucun produit trouvé dans la région: $RegionName" -ForegroundColor Red
        return 0
    }
}

function Show-Statistics {
    Write-Host "`n📊 STATISTIQUES BASE DE DONNÉES" -ForegroundColor Cyan
    Write-Host "=" * 70
    
    $total = $db.manufacturers.PSObject.Properties.Count
    Write-Host "`nTotal de produits: $total" -ForegroundColor Green
    
    # Par catégorie
    Write-Host "`n📦 Par Catégorie:" -ForegroundColor Yellow
    $db.manufacturers.PSObject.Properties | 
        Group-Object { $_.Value.category } | 
        Sort-Object Count -Descending | 
        ForEach-Object {
            Write-Host ("  {0,-35} : {1,3} produits" -f $_.Name, $_.Count) -ForegroundColor White
        }
    
    # Par marque
    Write-Host "`n🏪 Par Marque:" -ForegroundColor Yellow
    $db.manufacturers.PSObject.Properties | 
        Group-Object { $_.Value.brand } | 
        Sort-Object Count -Descending | 
        ForEach-Object {
            Write-Host ("  {0,-35} : {1,3} produits" -f $_.Name, $_.Count) -ForegroundColor White
        }
    
    # Par driver
    Write-Host "`n🔧 Par Driver:" -ForegroundColor Yellow
    $db.manufacturers.PSObject.Properties | 
        Group-Object { $_.Value.driver } | 
        Sort-Object Count -Descending | 
        Select-Object -First 10 | 
        ForEach-Object {
            Write-Host ("  {0,-35} : {1,3} produits" -f $_.Name, $_.Count) -ForegroundColor White
        }
    
    # Par région
    Write-Host "`n🌍 Par Région:" -ForegroundColor Yellow
    $db.manufacturers.PSObject.Properties | 
        Group-Object { $_.Value.region } | 
        Sort-Object Count -Descending | 
        ForEach-Object {
            Write-Host ("  {0,-35} : {1,3} produits" -f $_.Name, $_.Count) -ForegroundColor White
        }
    
    Write-Host ""
}

function Show-InteractiveMenu {
    while ($true) {
        Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║     🔍 RECHERCHE MANUFACTURER DATABASE - MENU INTERACTIF  ║" -ForegroundColor Cyan
        Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  1. Rechercher par Manufacturer ID" -ForegroundColor White
        Write-Host "  2. Rechercher par Marque" -ForegroundColor White
        Write-Host "  3. Rechercher par Catégorie" -ForegroundColor White
        Write-Host "  4. Rechercher par Driver" -ForegroundColor White
        Write-Host "  5. Rechercher par Région" -ForegroundColor White
        Write-Host "  6. Afficher les statistiques" -ForegroundColor White
        Write-Host "  7. Lister toutes les catégories" -ForegroundColor White
        Write-Host "  8. Lister toutes les marques" -ForegroundColor White
        Write-Host "  9. Lister tous les drivers" -ForegroundColor White
        Write-Host "  0. Quitter" -ForegroundColor Red
        Write-Host ""
        
        $choice = Read-Host "Votre choix"
        
        switch ($choice) {
            "1" {
                $id = Read-Host "`nEntrez le Manufacturer ID (ex: _TZ3000_12sxjap4)"
                Search-ByManufacturerId -Id $id
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "2" {
                $brand = Read-Host "`nEntrez la marque (ex: LIVARNO LUX, Woox, Silvercrest)"
                Search-ByBrand -BrandName $brand
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "3" {
                $cat = Read-Host "`nEntrez la catégorie (ex: Smart Lighting, Dimmers)"
                Search-ByCategory -CategoryName $cat
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "4" {
                $drv = Read-Host "`nEntrez le driver (ex: bulb_color_rgbcct_ac)"
                Search-ByDriver -DriverName $drv
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "5" {
                $reg = Read-Host "`nEntrez la région (ex: Europe, Global, Lidl)"
                Search-ByRegion -RegionName $reg
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "6" {
                Show-Statistics
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "7" {
                Write-Host "`n📦 CATÉGORIES DISPONIBLES:" -ForegroundColor Yellow
                $db.manufacturers.PSObject.Properties | 
                    ForEach-Object { $_.Value.category } | 
                    Sort-Object -Unique | 
                    ForEach-Object { Write-Host "  • $_" -ForegroundColor White }
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "8" {
                Write-Host "`n🏪 MARQUES DISPONIBLES:" -ForegroundColor Yellow
                $db.manufacturers.PSObject.Properties | 
                    ForEach-Object { $_.Value.brand } | 
                    Sort-Object -Unique | 
                    ForEach-Object { Write-Host "  • $_" -ForegroundColor White }
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "9" {
                Write-Host "`n🔧 DRIVERS DISPONIBLES:" -ForegroundColor Yellow
                $db.manufacturers.PSObject.Properties | 
                    ForEach-Object { $_.Value.driver } | 
                    Sort-Object -Unique | 
                    ForEach-Object { Write-Host "  • $_" -ForegroundColor White }
                Read-Host "`nAppuyez sur Entrée pour continuer"
            }
            "0" {
                Write-Host "`n👋 Au revoir!" -ForegroundColor Green
                return
            }
            default {
                Write-Host "`n❌ Choix invalide. Veuillez réessayer." -ForegroundColor Red
                Start-Sleep -Seconds 1
            }
        }
    }
}

# Main execution
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      🔍 MANUFACTURER DATABASE SEARCH v2.15.94             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if ($Interactive) {
    Show-InteractiveMenu
} elseif ($ManufacturerId) {
    Search-ByManufacturerId -Id $ManufacturerId
} elseif ($Brand) {
    Search-ByBrand -BrandName $Brand
} elseif ($Category) {
    Search-ByCategory -CategoryName $Category
} elseif ($Driver) {
    Search-ByDriver -DriverName $Driver
} elseif ($Region) {
    Search-ByRegion -RegionName $Region
} else {
    Write-Host "`nUtilisation:" -ForegroundColor Yellow
    Write-Host "  .\SEARCH_MANUFACTURER.ps1 -Interactive" -ForegroundColor White
    Write-Host "  .\SEARCH_MANUFACTURER.ps1 -ManufacturerId '_TZ3000_12sxjap4'" -ForegroundColor White
    Write-Host "  .\SEARCH_MANUFACTURER.ps1 -Brand 'LIVARNO LUX'" -ForegroundColor White
    Write-Host "  .\SEARCH_MANUFACTURER.ps1 -Category 'Smart Lighting'" -ForegroundColor White
    Write-Host "  .\SEARCH_MANUFACTURER.ps1 -Driver 'bulb_color_rgbcct_ac'" -ForegroundColor White
    Write-Host "  .\SEARCH_MANUFACTURER.ps1 -Region 'Lidl'" -ForegroundColor White
    Write-Host ""
    
    $response = Read-Host "Voulez-vous lancer le mode interactif? (O/N)"
    if ($response -eq 'O' -or $response -eq 'o') {
        Show-InteractiveMenu
    }
}
