# Publication Finale - Universal Tuya Zigbee v2.15.133
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PUBLICATION FINALE v2.15.133" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Validation Homey
Write-Host "1. Validation Homey..." -ForegroundColor Yellow
& homey app validate --level publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Validation echouee!" -ForegroundColor Red
    exit 1
}

Write-Host "   Validation OK!" -ForegroundColor Green
Write-Host ""

# 2. Mise a jour automatique
Write-Host "2. Mise a jour automatique docs..." -ForegroundColor Yellow
& node scripts/automation/update-all-links.js
Write-Host "   Docs mis a jour!" -ForegroundColor Green
Write-Host ""

# 3. Add all changes
Write-Host "3. Git add..." -ForegroundColor Yellow
& git add -A
Write-Host "   Fichiers ajoutes!" -ForegroundColor Green
Write-Host ""

# 4. Commit
Write-Host "4. Git commit..." -ForegroundColor Yellow
& git commit -m "Release: v2.15.133 FINAL - Documentation complete (400KB), Implementation base (67%), Database (100+ devices), Auto-update system, Ready for production"
Write-Host "   Commite!" -ForegroundColor Green
Write-Host ""

# 5. Push (declenche GitHub Actions)
Write-Host "5. Git push (declenchement GitHub Actions)..." -ForegroundColor Yellow
& git push origin master
Write-Host "   Pushe!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  PUBLICATION DECLENCHEE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub Actions va:" -ForegroundColor Cyan
Write-Host "  1. Update docs" -ForegroundColor White
Write-Host "  2. Validate app" -ForegroundColor White
Write-Host "  3. Publish to Homey App Store" -ForegroundColor White
Write-Host ""
Write-Host "ETA: 5-10 minutes" -ForegroundColor Yellow
Write-Host ""
Write-Host "Verifier sur:" -ForegroundColor Cyan
Write-Host "  https://homey.app/a/com.dlnraja.tuya.zigbee/" -ForegroundColor White
Write-Host "  https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
Write-Host ""
