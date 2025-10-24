Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit Organisation Projet ===" -ForegroundColor Cyan

# Add all changes
& git add -A

# Commit
& git commit -m "Docs: Organisation complete projet (docs/ + scripts/ structure propre)"

# Push
& git push origin master

Write-Host ""
Write-Host "Organisation commitee et pushee!" -ForegroundColor Green
