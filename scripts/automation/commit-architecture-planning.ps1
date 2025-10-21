# Commit Architecture Planning & Metadata
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit Architecture Planning ===" -ForegroundColor Cyan

# Mise a jour automatique
Write-Host "Mise a jour automatique des docs..." -ForegroundColor Yellow
& node scripts/automation/update-all-links.js

# Add all changes
& git add -A

# Commit
& git commit -m "Docs: Architecture reorganization planning + Driver metadata (183 drivers categorized, v3.0.0 roadmap)"

# Push
& git push origin master

Write-Host ""
Write-Host "Architecture planning committed!" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Yellow
Write-Host "  - ARCHITECTURE_REORGANIZATION.md (complete plan)" -ForegroundColor White
Write-Host "  - DRIVER_REORGANIZATION_STRATEGY.md (strategy + risks)" -ForegroundColor White
Write-Host "  - DRIVER_CATEGORIES.json (183 drivers metadata)" -ForegroundColor White
Write-Host "  - reorganize-drivers-architecture.ps1 (migration script)" -ForegroundColor White
Write-Host "  - add-driver-metadata.ps1 (metadata script)" -ForegroundColor White
Write-Host ""
Write-Host "Status: Ready for v3.0.0 migration (future)" -ForegroundColor Cyan
Write-Host "Current: v2.15.133 stable, no changes to drivers" -ForegroundColor Green
