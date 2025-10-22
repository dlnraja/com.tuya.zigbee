# Script pour retirer alarm_battery de tous les driver.compose.json (SDK3)
# alarm_battery n'est plus supporté dans Homey SDK3

$driversPath = "c:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$files = Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json"

$fixed = 0
$errors = 0

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        
        # Vérifier si alarm_battery existe
        if ($content -match "alarm_battery") {
            Write-Host "Correction: $($file.Directory.Name)" -ForegroundColor Yellow
            
            # Pattern 1: ",\n    \"alarm_battery\""
            $content = $content -replace ',\s*"alarm_battery"', ''
            
            # Pattern 2: "alarm_battery",
            $content = $content -replace '"alarm_battery",\s*', ''
            
            # Pattern 3: "alarm_battery" seul (dernier élément)
            $content = $content -replace '"alarm_battery"\s*\]', ']'
            
            # Sauvegarder
            $content | Set-Content $file.FullName -Encoding UTF8 -NoNewline
            $fixed++
            Write-Host "  ✓ Corrigé" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Erreur: $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RÉSUMÉ:" -ForegroundColor Cyan
Write-Host "  Fichiers corrigés: $fixed" -ForegroundColor Green
Write-Host "  Erreurs: $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n✓ alarm_battery retiré de tous les drivers (SDK3)" -ForegroundColor Green
