# Script de migration des drivers
Write-Host "🔄 MIGRATION DES DRIVERS" -ForegroundColor Green

$DriversDir = "drivers"
$Sdk3Dir = "drivers/sdk3"
$LegacyDir = "drivers/legacy"
$InProgressDir = "drivers/in_progress"

# Analyser chaque driver
Get-ChildItem -Path $DriversDir -Directory | Where-Object { $_.Name -notin @("sdk3", "legacy", "in_progress") } | ForEach-Object {
    $DriverName = $_.Name
    $DriverPath = $_.FullName
    $DeviceFile = Join-Path $DriverPath "device.js"
    
    Write-Host "🔍 Analyse du driver: $DriverName" -ForegroundColor Yellow
    
    if (Test-Path $DeviceFile) {
        $Content = Get-Content $DeviceFile -Raw -ErrorAction SilentlyContinue
        
        # Détecter la compatibilité SDK3
        $IsSdk3 = $Content -match "Homey\.Device" -or $Content -match "SDK3" -or $Content -match "v3"
        $HasLegacyCode = $Content -match "Homey\.Manager" -or $Content -match "SDK2" -or $Content -match "v2"
        
        if ($IsSdk3 -and !$HasLegacyCode) {
            Write-Host "✅ Driver $DriverName -> SDK3" -ForegroundColor Green
            Move-Item $DriverPath -Destination $Sdk3Dir -Force
        } elseif ($HasLegacyCode) {
            Write-Host "⚠️ Driver $DriverName -> Legacy" -ForegroundColor Yellow
            Move-Item $DriverPath -Destination $LegacyDir -Force
        } else {
            Write-Host "🔄 Driver $DriverName -> In Progress" -ForegroundColor Blue
            Move-Item $DriverPath -Destination $InProgressDir -Force
        }
    } else {
        Write-Host "❓ Driver $DriverName -> In Progress (pas de device.js)" -ForegroundColor Gray
        Move-Item $DriverPath -Destination $InProgressDir -Force
    }
}

Write-Host "✅ Migration des drivers terminée!" -ForegroundColor Green

# Afficher les statistiques
$Sdk3Count = (Get-ChildItem -Path $Sdk3Dir -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
$LegacyCount = (Get-ChildItem -Path $LegacyDir -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
$InProgressCount = (Get-ChildItem -Path $InProgressDir -Directory -ErrorAction SilentlyContinue | Measure-Object).Count

Write-Host ""
Write-Host "📊 STATISTIQUES:" -ForegroundColor Cyan
Write-Host "  - Drivers SDK3: $Sdk3Count" -ForegroundColor White
Write-Host "  - Drivers Legacy: $LegacyCount" -ForegroundColor White
Write-Host "  - Drivers En cours: $InProgressCount" -ForegroundColor White 
