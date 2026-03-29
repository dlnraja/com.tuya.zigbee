#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════════════
# FIND TRUE DUPLICATE MANUFACTURERNAMES ACROSS DRIVERS
# A manufacturerName can be in multiple drivers IF productId is DIFFERENT
# TRUE CONFLICT = same manufacturerName + same productId in multiple drivers
# ═══════════════════════════════════════════════════════════════════════════════

$driversPath = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$pairMap = @{}  # Key = "manufacturerName|productId", Value = list of drivers
$driverData = @{}  # Store driver productId lists

Write-Host "🔍 Scanning all driver.compose.json files for TRUE conflicts..." -ForegroundColor Cyan
Write-Host "   (Same manufacturerName + same productId in multiple drivers)" -ForegroundColor Gray

Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json" | ForEach-Object {
    $driverFile = $_.FullName
    $driverName = $_.Directory.Name
    
    try {
        $jsonContent = Get-Content $driverFile -Raw -Encoding UTF8
        $json = $jsonContent | ConvertFrom-Json
        
        # Get manufacturerName and productId arrays
        if ($json.zigbee) {
            $mfrList = @()
            $pidList = @()
            
            if ($json.zigbee.PSObject.Properties.Name -contains 'manufacturerName') {
                $mfrList = @($json.zigbee.manufacturerName)
            }
            if ($json.zigbee.PSObject.Properties.Name -contains 'productId') {
                $pidList = @($json.zigbee.productId)
            }
            
            # Store driver data
            $driverData[$driverName] = @{
                ManufacturerNames = $mfrList
                ProductIds = $pidList
            }
            
            # Create pairs for each manufacturerName + productId combination
            foreach ($mfr in $mfrList) {
                foreach ($prodId in $pidList) {
                    if ($mfr -and $prodId) {
                        $pairKey = "$mfr|$prodId"
                        if (-not $pairMap.ContainsKey($pairKey)) {
                            $pairMap[$pairKey] = @()
                        }
                        $pairMap[$pairKey] += $driverName
                    }
                }
            }
        }
    } catch {
        Write-Warning "Failed to parse: $driverFile - $($_.Exception.Message)"
    }
}

Write-Host "`n🚨 TRUE CONFLICTS DETECTED (same mfr + same productId in multiple drivers):" -ForegroundColor Red
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red

$conflicts = @()
$duplicateCount = 0

foreach ($pairKey in $pairMap.Keys | Sort-Object) {
    $drivers = $pairMap[$pairKey] | Select-Object -Unique
    if ($drivers.Count -gt 1) {
        $duplicateCount++
        $parts = $pairKey -split '\|'
        $mfr = $parts[0]
        $prodId = $parts[1]
        
        Write-Host "`n[$duplicateCount] $mfr + $prodId" -ForegroundColor Yellow
        Write-Host "    Found in $($drivers.Count) drivers:" -ForegroundColor White
        foreach ($driver in $drivers | Sort-Object) {
            Write-Host "    - $driver" -ForegroundColor Gray
        }
        
        $conflicts += [PSCustomObject]@{
            ManufacturerName = $mfr
            ProductId = $prodId
            DriverCount = $drivers.Count
            Drivers = ($drivers -join ", ")
        }
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Red
Write-Host "📊 SUMMARY:" -ForegroundColor Cyan
Write-Host "Total pairs scanned: $($pairMap.Keys.Count)" -ForegroundColor White
Write-Host "TRUE conflicts found: $duplicateCount" -ForegroundColor $(if ($duplicateCount -eq 0) { "Green" } else { "Red" })

if ($duplicateCount -gt 0) {
    $outputPath = "C:\Users\HP\Desktop\homey app\tuya_repair\tools\true_manufacturer_conflicts.csv"
    $conflicts | Export-Csv -Path $outputPath -NoTypeInformation -Encoding UTF8
    Write-Host "`n✅ Report exported to: $outputPath" -ForegroundColor Green
} else {
    Write-Host "`n✅ No true conflicts found! ManufacturerNames with different productIds are OK." -ForegroundColor Green
}
