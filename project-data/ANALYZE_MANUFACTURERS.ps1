# Script d'analyse des manufacturer names dans tous les drivers
# Identifie les patterns, gaps et similitudes

$driversPath = "c:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$allManufacturers = @{}
$manufacturersByPrefix = @{}
$driverCounts = @{}

Write-Host "🔍 Analyse des manufacturer names dans tous les drivers..." -ForegroundColor Cyan

# Parcourir tous les driver.compose.json
Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json" | ForEach-Object {
    $driverPath = $_.DirectoryName
    $driverName = Split-Path $driverPath -Leaf
    
    try {
        $json = Get-Content $_.FullName -Raw | ConvertFrom-Json
        
        if ($json.zigbee -and $json.zigbee.manufacturerName) {
            $manufacturers = $json.zigbee.manufacturerName
            
            if ($manufacturers -is [System.Array]) {
                $count = $manufacturers.Count
                $driverCounts[$driverName] = $count
                
                foreach ($mfr in $manufacturers) {
                    # Stocker tous les manufacturers
                    if (-not $allManufacturers.ContainsKey($mfr)) {
                        $allManufacturers[$mfr] = @()
                    }
                    $allManufacturers[$mfr] += $driverName
                    
                    # Extraire le préfixe (ex: _TZ3000_, _TZE200_, etc.)
                    if ($mfr -match '^(_TZ[A-Z0-9]{4})_') {
                        $prefix = $matches[1]
                        if (-not $manufacturersByPrefix.ContainsKey($prefix)) {
                            $manufacturersByPrefix[$prefix] = @()
                        }
                        $manufacturersByPrefix[$prefix] += $mfr
                    }
                    elseif ($mfr -match '^(_TYZB[0-9]{2})_') {
                        $prefix = $matches[1]
                        if (-not $manufacturersByPrefix.ContainsKey($prefix)) {
                            $manufacturersByPrefix[$prefix] = @()
                        }
                        $manufacturersByPrefix[$prefix] += $mfr
                    }
                    elseif ($mfr -match '^(TUYATEC)') {
                        $prefix = "TUYATEC"
                        if (-not $manufacturersByPrefix.ContainsKey($prefix)) {
                            $manufacturersByPrefix[$prefix] = @()
                        }
                        $manufacturersByPrefix[$prefix] += $mfr
                    }
                }
            }
        }
    }
    catch {
        Write-Host "  ⚠️ Erreur lecture: $driverName" -ForegroundColor Yellow
    }
}

# Statistiques globales
Write-Host "`n📊 STATISTIQUES GLOBALES" -ForegroundColor Green
Write-Host "=" * 80
Write-Host "Total drivers analysés: $($driverCounts.Count)"
Write-Host "Total manufacturer names uniques: $($allManufacturers.Count)"
Write-Host "Total prefixes identifiés: $($manufacturersByPrefix.Count)"

# Top 10 drivers avec le plus de manufacturers
Write-Host "`n🏆 TOP 10 DRIVERS (par nombre de manufacturer names)" -ForegroundColor Green
Write-Host "=" * 80
$driverCounts.GetEnumerator() | 
    Sort-Object -Property Value -Descending | 
    Select-Object -First 10 | 
    ForEach-Object {
        Write-Host ("{0,-60} : {1,3} manufacturers" -f $_.Key, $_.Value)
    }

# Distribution par préfixe
Write-Host "`n📦 DISTRIBUTION PAR PRÉFIXE" -ForegroundColor Green
Write-Host "=" * 80
$manufacturersByPrefix.GetEnumerator() | 
    Sort-Object -Property { $_.Value.Count } -Descending | 
    ForEach-Object {
        $uniqueCount = ($_.Value | Select-Object -Unique).Count
        Write-Host ("{0,-15} : {1,4} manufacturers uniques" -f $_.Key, $uniqueCount)
    }

# Manufacturers utilisés dans plusieurs drivers (potentiellement à organiser)
Write-Host "`n🔄 MANUFACTURERS UTILISÉS DANS PLUSIEURS DRIVERS (>3)" -ForegroundColor Yellow
Write-Host "=" * 80
$allManufacturers.GetEnumerator() | 
    Where-Object { $_.Value.Count -gt 3 } |
    Sort-Object -Property { $_.Value.Count } -Descending |
    Select-Object -First 20 |
    ForEach-Object {
        Write-Host ("{0,-30} : {1,2} drivers" -f $_.Key, $_.Value.Count)
        # Write-Host "  └─ $($_.Value -join ', ')" -ForegroundColor Gray
    }

# Exporter vers fichier JSON pour analyse détaillée
$analysisData = @{
    totalDrivers = $driverCounts.Count
    totalManufacturers = $allManufacturers.Count
    totalPrefixes = $manufacturersByPrefix.Count
    driverCounts = $driverCounts
    manufacturersByPrefix = $manufacturersByPrefix
    allManufacturers = $allManufacturers
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

$outputPath = "c:\Users\HP\Desktop\homey app\tuya_repair\MANUFACTURER_ANALYSIS.json"
$analysisData | ConvertTo-Json -Depth 10 | Set-Content $outputPath
Write-Host "`n✅ Analyse complète exportée: MANUFACTURER_ANALYSIS.json" -ForegroundColor Green

# Suggestions de manufacturer names similaires à rechercher
Write-Host "`n💡 PATTERNS À RECHERCHER POUR COMPLÉTER" -ForegroundColor Magenta
Write-Host "=" * 80
Write-Host "Basé sur les patterns existants, rechercher:"
Write-Host "  • _TZ3000_xxxxxxxx (pattern le plus courant)"
Write-Host "  • _TZE200_xxxxxxxx (deuxième plus courant)"  
Write-Host "  • _TZ3210_xxxxxxxx"
Write-Host "  • _TYZB01_xxxxxxxx"
Write-Host "  • _TZE204_xxxxxxxx"
Write-Host "  • _TZ3400_xxxxxxxx"
Write-Host "`nConsulter les forums, GitHub issues et diagnostic reports pour:"
Write-Host "  1. Nouveaux manufacturer IDs avec patterns similaires"
Write-Host "  2. Variantes de devices existants (ex: _TZE284_ variant de _TZE204_)"
Write-Host "  3. Product IDs associés (TS0201, TS0601, etc.)"

Write-Host "`n✨ Analyse terminée!" -ForegroundColor Green
