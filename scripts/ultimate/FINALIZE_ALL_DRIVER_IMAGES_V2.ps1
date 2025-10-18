# FINALISATION IMAGES - AJOUTER OBJET IMAGES À TOUS LES DRIVERS

Write-Host "🖼️  FINALISATION IMAGES OBJECT - TOUS LES 183 DRIVERS`n" -ForegroundColor Cyan

$driversDir = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$drivers = Get-ChildItem -Path $driversDir -Directory

$added = 0
$skipped = 0
$errors = 0

foreach ($driver in $drivers) {
    $driverName = $driver.Name
    $composeJsonPath = Join-Path $driver.FullName "driver.compose.json"
    
    if (-not (Test-Path $composeJsonPath)) {
        $skipped++
        continue
    }
    
    try {
        $json = Get-Content $composeJsonPath -Raw | ConvertFrom-Json
        
        # Vérifier si images object existe et est correct
        $needsUpdate = $false
        
        if (-not $json.images) {
            $needsUpdate = $true
        } elseif (-not $json.images.small -or -not $json.images.large -or -not $json.images.xlarge) {
            $needsUpdate = $true
        } elseif ($json.images.small -notmatch "assets/images" -or $json.images.large -notmatch "assets/images" -or $json.images.xlarge -notmatch "assets/images") {
            $needsUpdate = $true
        }
        
        if ($needsUpdate) {
            # Créer objet images
            $imagesObject = [PSCustomObject]@{
                small = "./assets/images/small.png"
                large = "./assets/images/large.png"
                xlarge = "./assets/images/xlarge.png"
            }
            
            # Ajouter ou remplacer
            $json | Add-Member -MemberType NoteProperty -Name "images" -Value $imagesObject -Force
            
            # Sauvegarder
            $json | ConvertTo-Json -Depth 100 | Set-Content $composeJsonPath -Encoding UTF8
            
            Write-Host "✅ $driverName" -ForegroundColor Green
            $added++
        } else {
            $skipped++
        }
        
    } catch {
        Write-Host "❌ ${driverName}: $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n📊 RÉSUMÉ:" -ForegroundColor Cyan
Write-Host "   ✅ Ajouté/Corrigé: $added" -ForegroundColor Green
Write-Host "   ⏭️  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "   ❌ Erreurs: $errors" -ForegroundColor Red
Write-Host "`n🎉 Done!" -ForegroundColor Cyan
