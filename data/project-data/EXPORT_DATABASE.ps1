# Script d'export de la base de données manufacturer vers différents formats
# Formats supportés: CSV, HTML, Markdown, JSON flat

param(
    [ValidateSet('CSV', 'HTML', 'Markdown', 'All')]
    [string]$Format = 'All',
    
    [string]$OutputPath = $PSScriptRoot
)

$dbPath = Join-Path $PSScriptRoot "MANUFACTURER_DATABASE.json"
$db = Get-Content $dbPath -Raw | ConvertFrom-Json

Write-Host "📦 EXPORT MANUFACTURER DATABASE" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host "Source: $dbPath"
Write-Host "Destination: $OutputPath"
Write-Host "Format: $Format`n"

# Préparer les données pour l'export
$exportData = @()
foreach ($prop in $db.manufacturers.PSObject.Properties) {
    $id = $prop.Name
    $product = $prop.Value
    
    $exportData += [PSCustomObject]@{
        ManufacturerId = $id
        Brand = $product.brand
        ProductName = $product.productName
        ProductId = $product.productId
        Category = $product.category
        Description = $product.description
        Features = ($product.features -join ' | ')
        Driver = $product.driver
        PowerSource = $product.powerSource
        Region = $product.region
        Verified = $product.verified
        BatteryLife = $product.batteryLife
        Retailer = $product.retailer
        Technology = $product.technology
        MaxLoad = $product.maxLoad
        Certifications = ($product.certifications -join ', ')
    }
}

# Export CSV
if ($Format -eq 'CSV' -or $Format -eq 'All') {
    $csvPath = Join-Path $OutputPath "MANUFACTURER_DATABASE.csv"
    $exportData | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
    Write-Host "✅ CSV exporté: $csvPath" -ForegroundColor Green
}

# Export HTML
if ($Format -eq 'HTML' -or $Format -eq 'All') {
    $htmlPath = Join-Path $OutputPath "MANUFACTURER_DATABASE.html"
    
    $html = @"
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manufacturer Database v$($db.metadata.version)</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .meta { opacity: 0.9; font-size: 0.9em; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .filters {
            padding: 20px 30px;
            background: white;
            border-bottom: 2px solid #f0f0f0;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
        }
        .filter-btn:hover, .filter-btn.active {
            background: #667eea;
            color: white;
        }
        .search-box {
            flex: 1;
            min-width: 250px;
            padding: 10px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 14px;
        }
        .products {
            padding: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        .product-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s;
            cursor: pointer;
        }
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            border-color: #667eea;
        }
        .product-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }
        .product-brand {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .product-verified {
            color: #10b981;
            font-size: 1.2em;
        }
        .product-name {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
        }
        .product-id {
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            color: #666;
            background: #f5f5f5;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 10px;
        }
        .product-category {
            color: #764ba2;
            font-weight: 600;
            font-size: 0.9em;
            margin-bottom: 10px;
        }
        .product-description {
            color: #666;
            font-size: 0.9em;
            line-height: 1.5;
            margin-bottom: 15px;
        }
        .product-features {
            list-style: none;
            font-size: 0.85em;
        }
        .product-features li {
            padding: 4px 0;
            color: #555;
        }
        .product-features li:before {
            content: "✓ ";
            color: #10b981;
            font-weight: bold;
            margin-right: 5px;
        }
        .product-footer {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #f0f0f0;
            font-size: 0.85em;
            color: #888;
        }
        .tag {
            display: inline-block;
            background: #f0f0f0;
            padding: 3px 8px;
            border-radius: 12px;
            margin-right: 5px;
            margin-top: 5px;
            font-size: 0.8em;
        }
        footer {
            background: #2d3748;
            color: white;
            padding: 30px;
            text-align: center;
        }
        @media (max-width: 768px) {
            .products { grid-template-columns: 1fr; }
            h1 { font-size: 1.8em; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 Manufacturer Database</h1>
            <p class="meta">Version $($db.metadata.version) | Dernière mise à jour: $($db.metadata.lastUpdated)</p>
        </header>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">$($db.metadata.totalEntries)</div>
                <div class="stat-label">Produits</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$($exportData | Select-Object -ExpandProperty Category -Unique | Measure-Object | Select-Object -ExpandProperty Count)</div>
                <div class="stat-label">Catégories</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$($exportData | Select-Object -ExpandProperty Brand -Unique | Measure-Object | Select-Object -ExpandProperty Count)</div>
                <div class="stat-label">Marques</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$($exportData | Select-Object -ExpandProperty Driver -Unique | Measure-Object | Select-Object -ExpandProperty Count)</div>
                <div class="stat-label">Drivers</div>
            </div>
        </div>
        
        <div class="filters">
            <input type="text" class="search-box" id="searchBox" placeholder="🔍 Rechercher un produit, marque, ID...">
            <button class="filter-btn active" data-category="all">Tous</button>
"@

    # Ajouter les boutons de filtrage par catégorie
    $categories = $exportData | Select-Object -ExpandProperty Category -Unique | Sort-Object
    foreach ($cat in $categories) {
        $html += "`n            <button class='filter-btn' data-category='$cat'>$cat</button>"
    }
    
    $html += @"

        </div>
        
        <div class="products" id="productGrid">
"@

    # Ajouter chaque produit
    foreach ($product in $exportData) {
        $features = ($product.Features -split '\|' | Select-Object -First 3 | ForEach-Object { $_.Trim() })
        $verifiedIcon = if ($product.Verified -eq $true) { "✓" } else { "" }
        
        $html += @"

            <div class="product-card" data-category="$($product.Category)">
                <div class="product-header">
                    <span class="product-brand">$($product.Brand)</span>
                    <span class="product-verified">$verifiedIcon</span>
                </div>
                <div class="product-name">$($product.ProductName)</div>
                <div class="product-id">$($product.ManufacturerId)</div>
                <div class="product-category">📦 $($product.Category)</div>
                <div class="product-description">$($product.Description)</div>
                <ul class="product-features">
"@
        foreach ($feature in $features) {
            if ($feature) {
                $html += "`n                    <li>$feature</li>"
            }
        }
        
        $html += @"

                </ul>
                <div class="product-footer">
                    <div><strong>Driver:</strong> $($product.Driver)</div>
                    <div><strong>Région:</strong> $($product.Region)</div>
"@
        
        if ($product.Retailer) {
            $html += "`n                    <div><strong>Revendeur:</strong> $($product.Retailer)</div>"
        }
        
        if ($product.Technology) {
            $html += "`n                    <div class='tag'>🔬 $($product.Technology)</div>"
        }
        
        if ($product.BatteryLife) {
            $html += "`n                    <div class='tag'>🔋 $($product.BatteryLife)</div>"
        }
        
        $html += @"

                </div>
            </div>
"@
    }
    
    $html += @"

        </div>
        
        <footer>
            <p><strong>Tuya Zigbee Universal App</strong> - Manufacturer Database</p>
            <p>Sources: Zigbee2MQTT, Homey Community Forum, GitHub Issues</p>
            <p>Principe: UNBRANDED - Catégorisation par FONCTION</p>
        </footer>
    </div>
    
    <script>
        // Filtrage par catégorie
        const filterBtns = document.querySelectorAll('.filter-btn');
        const productCards = document.querySelectorAll('.product-card');
        const searchBox = document.getElementById('searchBox');
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.dataset.category;
                productCards.forEach(card => {
                    if (category === 'all' || card.dataset.category === category) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
        
        // Recherche en temps réel
        searchBox.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            productCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>
"@
    
    $html | Out-File -FilePath $htmlPath -Encoding UTF8
    Write-Host "✅ HTML exporté: $htmlPath" -ForegroundColor Green
}

# Export Markdown
if ($Format -eq 'Markdown' -or $Format -eq 'All') {
    $mdPath = Join-Path $OutputPath "MANUFACTURER_DATABASE_EXPORT.md"
    
    $md = @"
# Manufacturer Database v$($db.metadata.version)

**Dernière mise à jour**: $($db.metadata.lastUpdated)  
**Total de produits**: $($db.metadata.totalEntries)

---

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| **Total Produits** | $($db.metadata.totalEntries) |
| **Catégories** | $($exportData | Select-Object -ExpandProperty Category -Unique | Measure-Object | Select-Object -ExpandProperty Count) |
| **Marques** | $($exportData | Select-Object -ExpandProperty Brand -Unique | Measure-Object | Select-Object -ExpandProperty Count) |
| **Drivers** | $($exportData | Select-Object -ExpandProperty Driver -Unique | Measure-Object | Select-Object -ExpandProperty Count) |
| **Régions** | $($exportData | Select-Object -ExpandProperty Region -Unique | Measure-Object | Select-Object -ExpandProperty Count) |

---

## 📦 Produits par Catégorie

"@
    
    $byCategory = $exportData | Group-Object -Property Category | Sort-Object Name
    
    foreach ($category in $byCategory) {
        $md += "`n### $($category.Name) ($($category.Count) produits)`n`n"
        
        foreach ($product in ($category.Group | Sort-Object Brand, ProductName)) {
            $md += "#### $($product.Brand) - $($product.ProductName)`n`n"
            $md += "- **Manufacturer ID**: ``$($product.ManufacturerId)```n"
            $md += "- **Product ID**: ``$($product.ProductId)```n"
            $md += "- **Driver**: ``$($product.Driver)```n"
            $md += "- **Alimentation**: $($product.PowerSource)`n"
            $md += "- **Région**: $($product.Region)`n"
            
            if ($product.Retailer) {
                $md += "- **Revendeur**: $($product.Retailer)`n"
            }
            
            if ($product.Technology) {
                $md += "- **Technologie**: $($product.Technology)`n"
            }
            
            if ($product.BatteryLife) {
                $md += "- **Autonomie**: $($product.BatteryLife)`n"
            }
            
            $md += "`n**Description**: $($product.Description)`n`n"
            
            $features = $product.Features -split '\|'
            if ($features.Count -gt 0) {
                $md += "**Caractéristiques**:`n"
                foreach ($feature in $features) {
                    if ($feature.Trim()) {
                        $md += "- $($feature.Trim())`n"
                    }
                }
            }
            
            $md += "`n---`n`n"
        }
    }
    
    $md += @"

## 📚 Sources

- Zigbee2MQTT Database
- Homey Community Forum
- GitHub Issues
- Diagnostic Reports

## 🔗 Liens Utiles

- **Zigbee2MQTT**: https://www.zigbee2mqtt.io/supported-devices/
- **Homey Forum**: https://community.homey.app/
- **GitHub Repo**: https://github.com/dlnraja/com.tuya.zigbee

---

*Généré automatiquement le $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")*
"@
    
    $md | Out-File -FilePath $mdPath -Encoding UTF8
    Write-Host "✅ Markdown exporté: $mdPath" -ForegroundColor Green
}

Write-Host "`n✨ Export terminé!" -ForegroundColor Green
Write-Host "`nFichiers créés dans: $OutputPath" -ForegroundColor Cyan
